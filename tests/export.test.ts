import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import JSZip from "jszip";
import { describe, expect, it } from "vitest";
import { defaultUserSettings } from "../src/domain/defaults";
import { simulate } from "../src/domain/engine";
import { buildWorkbook } from "../src/export/xlsx/build";
import { buildDataSheetXml } from "../src/export/xlsx/dataSheet";
import { excelSerialDate } from "../src/export/xlsx/excelDates";
import { buildVariablesSheetXml } from "../src/export/xlsx/variablesSheet";
import { gbSct } from "../src/settings/places/gb-sct.place";

const templatePath = fileURLToPath(new URL("../src/export/xlsx/template.xlsx", import.meta.url));

function templateBytes(): ArrayBuffer {
  const buf = readFileSync(templatePath);
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
}

function scenario(durationYears = 5) {
  const user = { ...defaultUserSettings, durationYears };
  const rates = gbSct.taxYears[0];
  if (!rates) throw new Error("no Scotland rates");
  const result = simulate(gbSct, rates, user);
  return { user, rates, result };
}

describe("excelSerialDate", () => {
  it("matches Excel's epoch for post-1900 dates", () => {
    expect(excelSerialDate("1900-03-01")).toBe(61);
    expect(excelSerialDate("1900-01-01")).toBe(2);
  });

  it("advances by one per day", () => {
    expect(excelSerialDate("2026-10-08") - excelSerialDate("2026-10-01")).toBe(7);
  });
});

describe("buildVariablesSheetXml", () => {
  it("writes the user's inputs and computed rates", () => {
    const { user, rates } = scenario();
    const xml = buildVariablesSheetXml(gbSct, rates, user);

    expect(xml).toContain("Care home fee per week");
    expect(xml).toContain("<v>2200</v>");
    expect(xml).toContain("<v>50000</v>");
    expect(xml).toContain(`<v>${excelSerialDate(user.startDate)}</v>`);
    expect(xml).toContain("Computed: weekly income");
    expect(xml).toContain("<f>B6/52</f>");
    expect(xml).toContain("Care home deposit (weeks, returned at end)");
    expect(xml).toContain("Care home prepay weeks (paid up front)");
  });
});

describe("buildDataSheetXml", () => {
  it("produces all 31 columns for 5 years (260 rows)", () => {
    const { user, rates, result } = scenario();
    const xml = buildDataSheetXml(result, user, rates);

    expect(xml).toContain('dimension ref="A1:AE261"');
    expect(xml).toContain("Cash - end");
    expect(xml).toContain("<c r=\"P2\"");
    expect(xml).toContain("<c r=\"AE261\"");
    // marker columns use NA() outside the crossing weeks
    expect(xml).toContain("NA()");
    expect(xml).toContain("<f>MAX(0,C2+N2)</f>");
    // payment column references the deposit (B32) and prepay (B33) variables
    expect(xml).toContain("Variables!$B$32");
    expect(xml).toContain("Variables!$B$33");
  });
});

describe("buildWorkbook", () => {
  it("round-trips through JSZip with the chart and template parts intact", async () => {
    const { user, rates, result } = scenario();
    const blob = await buildWorkbook({ place: gbSct, rates, user, result }, templateBytes());
    const zip = await JSZip.loadAsync(blob);

    for (const name of [
      "[Content_Types].xml",
      "xl/workbook.xml",
      "xl/styles.xml",
      "xl/worksheets/sheet1.xml",
      "xl/worksheets/sheet2.xml",
      "xl/worksheets/sheet3.xml",
      "xl/worksheets/sheet4.xml",
      "xl/charts/chart1.xml",
      "xl/drawings/drawing1.xml",
    ]) {
      expect(zip.file(name), `missing ${name}`).toBeTruthy();
    }

    const chart = await zip.file("xl/charts/chart1.xml")!.async("string");
    expect(chart).toContain("$B$2:$B$261");
    expect(chart).toContain("$AB$2:$AB$261");

    const variables = await zip.file("xl/worksheets/sheet1.xml")!.async("string");
    expect(variables).toContain("<v>2200</v>");
  });

  it("resizes the chart range to the chosen duration", async () => {
    const { user, rates, result } = scenario(3);
    const blob = await buildWorkbook({ place: gbSct, rates, user, result }, templateBytes());
    const zip = await JSZip.loadAsync(blob);

    const chart = await zip.file("xl/charts/chart1.xml")!.async("string");
    expect(chart).toContain("$B$2:$B$157");
    expect(chart).not.toContain("$B$2:$B$261");
  });
});
