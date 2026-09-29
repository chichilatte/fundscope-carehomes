import { describe, expect, it } from "vitest";
import { defaultSelectedSettings, parseSelectedSettings, parseUserSettings } from "../src/settings/settings";
import { migrate, type MigrationStep } from "../src/settings/migrations";
import { loadSettings, saveSettings } from "../src/settings/repository";
import { SETTINGS_STORAGE_KEY } from "../src/settings/settings";
import { memoryStorage } from "../src/settings/storage";
import { getPlace, getTaxYear, places, resolveRates } from "../src/settings/places";
import { gbSct } from "../src/settings/places/gb-sct.place";

describe("settings model", () => {
  it("parses valid user settings and selections", () => {
    const sel = defaultSelectedSettings();
    expect(parseUserSettings(sel.user)).not.toBeNull();
    expect(parseSelectedSettings(sel)).not.toBeNull();
  });

  it("rejects malformed settings", () => {
    expect(parseUserSettings(null)).toBeNull();
    expect(parseUserSettings({ ...defaultSelectedSettings().user, cashSavings: "lots" })).toBeNull();
    expect(parseSelectedSettings({ ...defaultSelectedSettings(), placeId: "GB-MARS" })).toBeNull();
    expect(parseSelectedSettings({ ...defaultSelectedSettings(), taxYear: "" })).toBeNull();
  });
});

describe("places registry", () => {
  it("registers all four places", () => {
    expect(places.map((p) => p.id).sort()).toEqual(["GB-ENG", "GB-NIR", "GB-SCT", "GB-WLS"]);
  });

  it("looks up places and tax years with fallback", () => {
    expect(getPlace("GB-SCT")).toBe(gbSct);
    expect(getTaxYear(gbSct, "2025/26")?.year).toBe("2025/26");
    expect(resolveRates(gbSct, "unknown")?.year).toBe("2025/26"); // falls back to latest
  });
});

describe("migrations", () => {
  it("applies chained steps", () => {
    const steps: MigrationStep[] = [
      { from: 1, to: 2, up: (old) => ({ ...(old as Record<string, unknown>), added: true }) },
      { from: 2, to: 3, up: (old) => ({ ...(old as Record<string, unknown>), added2: true }) },
    ];
    const out = migrate({ a: 1 }, 1, 3, steps) as Record<string, unknown>;
    expect(out.a).toBe(1);
    expect(out.added).toBe(true);
    expect(out.added2).toBe(true);
  });

  it("is identity when already at the target version", () => {
    expect(migrate({ a: 1 }, 3, 3, [])).toEqual({ a: 1 });
  });

  it("throws on a missing step", () => {
    expect(() => migrate({}, 1, 2, [])).toThrow();
  });
});

describe("repository", () => {
  it("round-trips settings", () => {
    const storage = memoryStorage();
    const settings = defaultSelectedSettings();
    saveSettings(storage, settings);
    const loaded = loadSettings(storage);
    expect(loaded.source).toBe("stored");
    expect(loaded.migrated).toBe(false);
    expect(loaded.settings).toEqual(settings);
  });

  it("returns defaults when empty", () => {
    const loaded = loadSettings(memoryStorage());
    expect(loaded.source).toBe("defaults");
    expect(loaded.settings).toEqual(defaultSelectedSettings());
  });

  it("returns defaults on corrupt JSON", () => {
    const storage = memoryStorage();
    storage.set(SETTINGS_STORAGE_KEY, "{not json");
    expect(loadSettings(storage).source).toBe("defaults");
  });

  it("returns defaults for a future schema version (doesn't clobber)", () => {
    const storage = memoryStorage();
    storage.set(
      SETTINGS_STORAGE_KEY,
      JSON.stringify({ schemaVersion: 99, settings: defaultSelectedSettings() }),
    );
    expect(loadSettings(storage).source).toBe("defaults");
  });
});
