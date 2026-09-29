import JSZip from "jszip";
import type { Place, SimulationResult, TaxYearRates, UserSettings } from "../../domain/types";
import { buildChartSheetXml } from "./chartSheet";
import { buildDataSheetXml } from "./dataSheet";
import { buildVariablesSheetXml } from "./variablesSheet";

export interface WorkbookInput {
  place: Place;
  rates: TaxYearRates;
  user: UserSettings;
  result: SimulationResult;
}

/**
 * Build a downloadable workbook from the template xlsx.
 *
 * The template supplies the chart + drawing XML, styles, theme, content types
 * and relationships (all carried over verbatim); only the Variables, Data and
 * Chart sheets are regenerated with live formulas, and the chart's row range
 * is adjusted to the chosen duration.
 */
export async function buildWorkbook(input: WorkbookInput, template: ArrayBuffer): Promise<Blob> {
  const zip = await JSZip.loadAsync(template);

  zip.file(
    "xl/worksheets/sheet1.xml",
    buildVariablesSheetXml(input.place, input.rates, input.user),
  );
  zip.file("xl/worksheets/sheet3.xml", buildDataSheetXml(input.result, input.user, input.rates));
  zip.file("xl/worksheets/sheet2.xml", buildChartSheetXml(input.result, input.user, input.rates));

  const chartEntry = zip.file("xl/charts/chart1.xml");
  if (chartEntry) {
    const last = 1 + input.result.weekly.length;
    const original = await chartEntry.async("string");
    zip.file("xl/charts/chart1.xml", original.replaceAll("261", String(last)));
  }

  return zip.generateAsync({ type: "blob", compression: "DEFLATE" });
}
