import { migrate, migrations } from "./migrations";
import {
  defaultSelectedSettings,
  parseSelectedSettings,
  SETTINGS_SCHEMA_VERSION,
  SETTINGS_STORAGE_KEY,
  type SelectedSettings,
} from "./settings";
import type { StorageAdapter } from "./storage";

export interface LoadResult {
  settings: SelectedSettings;
  /** True if the stored settings were migrated to the current schema version. */
  migrated: boolean;
  source: "stored" | "defaults";
}

interface Persisted {
  schemaVersion?: unknown;
  settings?: unknown;
}

export function saveSettings(adapter: StorageAdapter, settings: SelectedSettings): void {
  const payload = { schemaVersion: SETTINGS_SCHEMA_VERSION, settings };
  adapter.set(SETTINGS_STORAGE_KEY, JSON.stringify(payload));
}

export function loadSettings(adapter: StorageAdapter): LoadResult {
  const raw = adapter.get(SETTINGS_STORAGE_KEY);
  if (raw === null) return defaults();

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return defaults();
  }

  if (!isRecord(parsed) || typeof parsed.schemaVersion !== "number") return defaults();

  const version = parsed.schemaVersion;

  // Written by a newer version of this app: don't clobber it, just fall back.
  if (version > SETTINGS_SCHEMA_VERSION) return defaults();

  let candidate: unknown = parsed.settings;
  let migrated = false;
  if (version < SETTINGS_SCHEMA_VERSION) {
    try {
      candidate = migrate(candidate, version, SETTINGS_SCHEMA_VERSION, migrations);
      migrated = true;
    } catch {
      return defaults();
    }
  }

  const settings = parseSelectedSettings(candidate);
  if (!settings) return defaults();

  return { settings, migrated, source: "stored" };
}

function defaults(): LoadResult {
  return { settings: defaultSelectedSettings(), migrated: false, source: "defaults" };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
