import { describe, expect, it } from "vitest";
import { defaultUserSettings } from "../src/domain/defaults";
import { simulate } from "../src/domain/engine";
import { gbEng } from "../src/settings/places/gb-eng.place";
import { gbNir } from "../src/settings/places/gb-nir.place";
import { gbSct } from "../src/settings/places/gb-sct.place";
import { gbWls } from "../src/settings/places/gb-wls.place";
import { resolveRates } from "../src/settings/places";
import { populateDescription } from "../src/ui/notes";

describe("England, Wales and Northern Ireland", () => {
  for (const place of [gbEng, gbWls, gbNir]) {
    it(`${place.name} simulates with no negative balances`, () => {
      const rates = resolveRates(place, "2025/26");
      expect(rates).toBeDefined();
      expect(place.hasStandardRate).toBe(false);
      const result = simulate(place, rates!, defaultUserSettings);
      expect(result.standardRate).toBe(0); // no national council standard rate
      expect(result.topUp).toBe(0);
      for (const row of result.weekly) {
        expect(row.capitalEnd).toBeGreaterThanOrEqual(0);
        expect(row.cashEnd).toBeGreaterThanOrEqual(0);
        expect(row.homeEnd).toBeGreaterThanOrEqual(0);
      }
    });
  }

  it("England has no free personal care, so self-funders pay the full fee", () => {
    const result = simulate(gbEng, resolveRates(gbEng, "2025/26")!, defaultUserSettings);
    expect(result.weekly[0]!.residentPays).toBeCloseTo(2200, 6);
    expect(result.weekly[10]!.residentPays).toBeCloseTo(2200, 6);
  });

  it("England applies NHS-funded nursing care (£254.06/week) when nursing is awarded", () => {
    const user = { ...defaultUserSettings, nursingCareAwarded: true };
    const result = simulate(gbEng, resolveRates(gbEng, "2025/26")!, user);
    expect(result.weekly[10]!.fnc).toBeCloseTo(254.06, 6);
    expect(result.weekly[10]!.residentPays).toBeCloseTo(2200 - 254.06, 6);
  });

  it("Northern Ireland applies a £100/week nursing contribution when nursing is awarded", () => {
    const user = { ...defaultUserSettings, nursingCareAwarded: true };
    const result = simulate(gbNir, resolveRates(gbNir, "2025/26")!, user);
    expect(result.weekly[10]!.fnc).toBeCloseTo(100, 6);
    expect(result.weekly[10]!.residentPays).toBeCloseTo(2200 - 100, 6);
  });

  it("only Scotland has a national council standard rate", () => {
    expect(gbSct.hasStandardRate).toBe(true);
  });

  it("Wales uses a single £50,000 threshold with no tariff income", () => {
    const rates = resolveRates(gbWls, "2025/26")!;
    expect(rates.upperCapitalLimit).toBe(50000);
    expect(rates.lowerCapitalLimit).toBe(50000);
    expect(rates.tariffPerBand).toBe(0);
    const result = simulate(gbWls, rates, defaultUserSettings);
    const councilWeek = result.weekly.find((row) => row.phase !== "self-funder");
    expect(councilWeek).toBeDefined();
    expect(councilWeek!.tariffIncome).toBe(0);
  });

  it("populates an HTML description template from the resolved rates", () => {
    const template =
      '<dt>England · {{year}}</dt><dd><dl class="facts"><dt>Capital limits</dt><dd>{{upperCapitalLimit}} upper · {{lowerCapitalLimit}} lower</dd><dt>PEA</dt><dd>{{pea}}/wk</dd></dl></dd>';
    const eng = populateDescription(template, resolveRates(gbEng, "2025/26")!);
    expect(eng).toContain("<dt>England · 2025/26</dt>");
    expect(eng).toContain('<dl class="facts">');
    expect(eng).toContain("<dt>Capital limits</dt>");
    expect(eng).toContain("£23,250");
    expect(eng).toContain("£14,250");
    expect(eng).toContain("£30.15");
  });

  it("tags each tax year with its description template id", () => {
    expect(resolveRates(gbSct, "2025/26")!.descriptionId).toBe("note-GB-SCT");
    expect(resolveRates(gbEng, "2025/26")!.descriptionId).toBe("note-GB-ENG");
  });
});
