import { addWeeksISO } from "../../domain/dates";
import type { SimulationResult, TaxYearRates, UserSettings } from "../../domain/types";
import { formatISODate } from "../../format/dates";
import { formatGBPWhole } from "../../format/money";
import { colRef, formulaCell, inlineStrCell, intCell, worksheetXml } from "./sheetXml";

// Style IDs are fixed by the template's styles.xml (carried over verbatim).
const HEADER = 1;
const MONEY0 = 12;
const MONEY2 = 11;
const DATE = 14;

const COL_WIDTHS = [
  7, 12, 13, 13, 15, 15, 11, 11, 11, 12, 9, 12, 12, 11, 15, 13, 13, 30, 11, 11, 12, 12, 11, 13, 12, 12, 14, 14, 13, 16, 16,
];

function colsXml(): string {
  return (
    "<cols>" +
    COL_WIDTHS.map((w, i) => `<col width="${w}" customWidth="1" min="${i + 1}" max="${i + 1}" />`).join("") +
    "</cols>"
  );
}

function headerRow(headers: string[]): string {
  const cells = headers.map((h, i) => inlineStrCell(`${colRef(i + 1)}1`, h, HEADER)).join("");
  return `<row r="1">${cells}</row>`;
}

/** One Data row: column A is a static week number; the rest are live formulas. */
function dataRow(r: number, last: number): string {
  const ref = (c: number): string => colRef(c) + String(r);
  const f = (c: number, formula: string, style?: number): string => formulaCell(ref(c), formula, style);

  const cells = [
    intCell(ref(1), r - 1),
    f(2, `Variables!$B$24+(A${r}-1)*7`, DATE),
    f(3, r === 2 ? "Variables!$B$4" : `P${r - 1}`, MONEY0),
    f(4, r === 2 ? "Variables!$B$5" : `Q${r - 1}`, MONEY0),
    f(5, `C${r}+IF(A${r}>Variables!$B$25,D${r},0)`, MONEY0),
    f(6, `C${r}+D${r}`, MONEY0),
    f(7, `IF(A${r}>Variables!$B$22,Variables!$B$12,0)`, MONEY2),
    f(8, `IF(AND(A${r}>Variables!$B$22,Variables!$B$14="Yes"),Variables!$B$13,0)`, MONEY2),
    f(9, `IF(AA${r}>Variables!$B$18,0,IF(AA${r}>Variables!$B$19,CEILING((AA${r}-Variables!$B$19)/Variables!$B$21,1)*Variables!$B$20,0))`, MONEY2),
    f(10, `IF(AA${r}<=Variables!$B$18,MIN(Variables!$B$9-Variables!$B$8+I${r},Variables!$B$31),0)`, MONEY2),
    f(11, `IF(AA${r}<=Variables!$B$18,Variables!$B$27,0)`, MONEY2),
    f(12, `IF(AA${r}>Variables!$B$18,G${r}+H${r},Variables!$B$31-J${r})`, MONEY2),
    f(13, `IF(AA${r}>Variables!$B$18,Variables!$B$2-G${r}-H${r},J${r}+K${r})`, MONEY2),
    f(14, `Variables!$B$9-AC${r}`, MONEY2),
    f(15, `MAX(0,F${r}+N${r})`, MONEY0),
    f(16, `MAX(0,C${r}+N${r})`, MONEY0),
    f(17, `MAX(0,D${r}+MIN(0,C${r}+N${r}))`, MONEY0),
    f(18, `IF(AA${r}>Variables!$B$18,"Self-funder",IF(AA${r}>Variables!$B$19,"Tariff band - council contributing","Council pays standard rate"))`),
    f(19, `Variables!$B$18`, MONEY0),
    f(20, `Variables!$B$19`, MONEY0),
    f(21, `AA${r}<=Variables!$B$18`),
    f(22, `AA${r}<=Variables!$B$19`),
    f(23, `P${r}<=0`),
    f(24, `Variables!$B$28`, MONEY0),
    f(25, `AB${r}<=Variables!$B$28`),
    f(26, `AB${r}<=Variables!$B$18`),
    f(27, r === 2 ? "Variables!$B$4+Variables!$B$5" : `AB${r - 1}`, MONEY0),
    f(28, `MAX(0,AA${r}+Variables!$B$9-M${r})`, MONEY0),
    f(29, `IF(MOD(A${r}-1,Variables!$B$30)=0,Variables!$B$30*M${r},0)`, MONEY2),
    f(30, `IF(A${r}=MATCH(TRUE,$Y$2:$Y${last},0),MAX($AB$2:$AB${last}),IF(A${r}=MATCH(TRUE,$Y$2:$Y${last},0)-1,0,NA()))`, MONEY0),
    f(31, `IF(A${r}=MATCH(TRUE,$Z$2:$Z${last},0),MAX($AB$2:$AB${last}),IF(A${r}=MATCH(TRUE,$Z$2:$Z${last},0)-1,0,NA()))`, MONEY0),
  ];
  return `<row r="${r}">${cells.join("")}</row>`;
}

export function buildDataSheetXml(
  result: SimulationResult,
  user: UserSettings,
  rates: TaxYearRates,
): string {
  const weeks = result.weekly.length;
  const last = 1 + weeks;

  const meansDate =
    result.milestones.meansTestWeek === null
      ? "n/a"
      : formatISODate(addWeeksISO(user.startDate, result.milestones.meansTestWeek - 1));
  const upperDate =
    result.milestones.councilTakeoverWeek === null
      ? "n/a"
      : formatISODate(addWeeksISO(user.startDate, result.milestones.councilTakeoverWeek - 1));

  const headers = [
    "Week",
    "Date",
    "Cash - start",
    "Home - start",
    "Assessed capital - start",
    "Total wealth - start",
    "FPC this week",
    "FNC this week",
    "Tariff income",
    "Assessed contribution",
    "Top-up",
    "Council pays",
    "Resident pays",
    "Net change",
    "Total wealth - end",
    "Cash - end",
    "Home - end",
    "Phase",
    "Upper limit",
    "Lower limit",
    "Council contributing?",
    "Below lower limit?",
    "Cash exhausted?",
    "Means-test threshold",
    "Below means-test threshold?",
    "Total wealth <= upper limit?",
    "Capital (assessment) - start",
    "Capital (assessment) - end",
    "Care home payment this week",
    `Means-test crossing (${formatGBPWhole(rates.meansTestThreshold)}, ${meansDate})`,
    `Upper crossing (${formatGBPWhole(rates.upperCapitalLimit)}, ${upperDate})`,
  ];

  const rows = [headerRow(headers)];
  for (let r = 2; r <= last; r++) {
    rows.push(dataRow(r, last));
  }

  const sheetViews =
    '<sheetView workbookViewId="0"><pane xSplit="2" ySplit="1" topLeftCell="C2" activePane="bottomRight" state="frozen" /><selection pane="topRight" /><selection pane="bottomLeft" /><selection pane="bottomRight" activeCell="A1" sqref="A1" /></sheetView>';

  return worksheetXml({
    dimension: `A1:AE${last}`,
    sheetViews,
    cols: colsXml(),
    sheetData: rows.join(""),
  });
}
