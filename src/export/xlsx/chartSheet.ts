import type { SimulationResult, TaxYearRates, UserSettings } from "../../domain/types";
import { formatGBPWhole } from "../../format/money";
import { formulaCell, inlineStrCell, worksheetXml } from "./sheetXml";

// Style IDs are fixed by the template's styles.xml (carried over verbatim).
const TITLE = 10;
const BOLD = 2;
const MONEY2 = 11;
const MONEY0 = 12;
const INT = 13;

const label = (ref: string, text: string): string => inlineStrCell(ref, text, BOLD);

export function buildChartSheetXml(
  result: SimulationResult,
  user: UserSettings,
  rates: TaxYearRates,
): string {
  const end = 1 + result.weekly.length;
  const n = result.weekly.length;
  const meansLabel = formatGBPWhole(rates.meansTestThreshold);
  const upperLabel = formatGBPWhole(rates.upperCapitalLimit);

  const rows = [
    `<row r="1">${inlineStrCell("A1", "Key milestones", TITLE)}</row>`,
    `<row r="3">${label("A3", "Total weekly income")}${formulaCell("B3", "Variables!B9", MONEY2)}</row>`,
    `<row r="4">${label("A4", "Effective council standard rate")}${formulaCell("B4", "Variables!B26", MONEY2)}</row>`,
    `<row r="5">${label("A5", "Top-up per week (0 if home accepts standard rate)")}${formulaCell("B5", "Variables!B27", MONEY2)}</row>`,
    `<row r="6">${label("A6", "Total wealth at start")}${formulaCell("B6", "Variables!B4+Variables!B5", MONEY0)}</row>`,
    `<row r="7">${label("A7", "")}</row>`,
    `<row r="8">${label("A8", "Week cash runs out  ->  home must be sold")}${formulaCell("B8", `IF(COUNTIF(Data!W2:W${end},TRUE)=0,"Never",MATCH(TRUE,Data!W2:W${end},0))`, INT)}</row>`,
    `<row r="9">${label("A9", `Week total wealth falls to ${meansLabel} (means-test review)`)}${formulaCell("B9", `MATCH(TRUE,Data!Y2:Y${end},0)`, INT)}</row>`,
    `<row r="10">${label("A10", `Means-test crossing date (${meansLabel})`)}${formulaCell("B10", `TEXT(INDEX(Data!$B$2:$B$${end},MATCH(TRUE,Data!$Y$2:$Y$${end},0)),"dd mmm yyyy")`)}</row>`,
    `<row r="11">${label("A11", "Week council takes over funding (total wealth <= upper limit)")}${formulaCell("B11", `MATCH(TRUE,Data!Z2:Z${end},0)`, INT)}</row>`,
    `<row r="12">${label("A12", `Upper-threshold crossing date (${upperLabel})`)}${formulaCell("B12", `TEXT(INDEX(Data!$B$2:$B$${end},MATCH(TRUE,Data!$Z$2:$Z$${end},0)),"dd mmm yyyy")`)}</row>`,
    `<row r="13">${label("A13", "Week total wealth first falls to lower limit")}${formulaCell("B13", `IF(COUNTIF(Data!V2:V${end},TRUE)=0,"Never - capital stabilises",MATCH(TRUE,Data!V2:V${end},0))`, INT)}</row>`,
    `<row r="14">${label("A14", "Minimum total wealth reached")}${formulaCell("B14", `MIN(Data!AB2:AB${end})`, MONEY0)}</row>`,
    `<row r="15">${label("A15", `Total wealth at end of ${user.durationYears} years`)}${formulaCell("B15", `INDEX(Data!AB2:AB${end},${n})`, MONEY0)}</row>`,
  ];

  const sheetViews = '<sheetView workbookViewId="0"><selection activeCell="A1" sqref="A1" /></sheetView>';
  const cols = '<cols><col width="58" customWidth="1" min="1" max="1" /><col width="22" customWidth="1" min="2" max="2" /></cols>';
  const trailing =
    '<drawing xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" r:id="rId1" />';

  return worksheetXml({ dimension: "A1:B15", sheetViews, cols, sheetData: rows.join(""), trailing });
}
