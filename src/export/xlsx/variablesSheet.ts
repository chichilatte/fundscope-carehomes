import type { Place, TaxYearRates, UserSettings } from "../../domain/types";
import { excelSerialDate } from "./excelDates";
import { formulaCell, inlineStrCell, intCell, numCell, worksheetXml } from "./sheetXml";

// Style IDs are fixed by the template's styles.xml (carried over verbatim).
const HEADER = 1;
const BOLD = 2;
const MONEY2_INPUT = 3;
const MONEY0_INPUT = 4;
const MONEY2_COMPUTED = 5;
const MONEY0_COMPUTED = 6;
const TEXT_INPUT = 7;
const INT_INPUT = 8;
const DATE_INPUT = 9;

const yesNo = (v: boolean): string => (v ? "Yes" : "No");

export function buildVariablesSheetXml(place: Place, rates: TaxYearRates, user: UserSettings): string {
  const label = (ref: string, text: string): string => inlineStrCell(ref, text, BOLD);
  const note = (ref: string, text?: string): string => (text ? inlineStrCell(ref, text) : "");

  const rows = [
    `<row r="1">${inlineStrCell("A1", "Setting", HEADER)}${inlineStrCell("B1", "Value", HEADER)}${inlineStrCell("C1", "Notes", HEADER)}</row>`,
    `<row r="2">${label("A2", "Care home fee per week")}${numCell("B2", user.careHomeFeePerWeek, MONEY2_INPUT)}${note("C2", "What the home charges (£/week)")}</row>`,
    `<row r="4">${label("A4", "Cash savings at start")}${numCell("B4", user.cashSavings, MONEY0_INPUT)}${note("C4", "£")}</row>`,
    `<row r="5">${label("A5", "Home value at start")}${numCell("B5", user.homeValue, MONEY0_INPUT)}${note("C5", "£")}</row>`,
    `<row r="6">${label("A6", "Income per year")}${numCell("B6", user.incomePerYear, MONEY0_INPUT)}${note("C6", "£/year (your total income)")}</row>`,
    `<row r="8">${label("A8", "Personal Expenses Allowance (PEA)")}${numCell("B8", rates.pea, MONEY2_INPUT)}${note("C8", "Income you're allowed to keep (£/week)")}</row>`,
    `<row r="9">${label("A9", "Computed: weekly income")}${formulaCell("B9", "B6/52", MONEY2_COMPUTED)}</row>`,
    `<row r="10">${label("A10", "Computed: annual income")}${formulaCell("B10", "B6", MONEY0_COMPUTED)}</row>`,
    `<row r="12">${label("A12", "Free Personal Care (FPC) rate")}${numCell("B12", rates.fpc, MONEY2_INPUT)}${note("C12", "Paid by council regardless of capital (£/week)")}</row>`,
    `<row r="13">${label("A13", "Free Nursing Care (FNC) rate")}${numCell("B13", rates.fnc, MONEY2_INPUT)}${note("C13", "Paid only if nursing care awarded (£/week)")}</row>`,
    `<row r="14">${label("A14", "Nursing care awarded?")}${inlineStrCell("B14", yesNo(user.nursingCareAwarded), TEXT_INPUT)}${note("C14", "Yes = FNC paid + higher standard rate; No = personal-only")}</row>`,
    `<row r="16">${label("A16", "Council standard rate - personal care only")}${numCell("B16", rates.standardRatePersonal, MONEY2_INPUT)}${note("C16", "Council standard rate, personal care (£/week; 0 if none)")}</row>`,
    `<row r="17">${label("A17", "Council standard rate - with nursing")}${numCell("B17", rates.standardRateNursing, MONEY2_INPUT)}${note("C17", "Council standard rate, with nursing (£/week; 0 if none)")}</row>`,
    `<row r="18">${label("A18", "Upper capital limit")}${numCell("B18", rates.upperCapitalLimit, MONEY0_INPUT)}${note("C18", "Above this: self-funder (£)")}</row>`,
    `<row r="19">${label("A19", "Lower capital limit")}${numCell("B19", rates.lowerCapitalLimit, MONEY0_INPUT)}${note("C19", "Below this: no tariff income (£)")}</row>`,
    `<row r="20">${label("A20", "Tariff income per £250")}${numCell("B20", rates.tariffPerBand, MONEY2_INPUT)}${note("C20", "£ per week per £250 (or part) over lower limit")}</row>`,
    `<row r="21">${label("A21", "Tariff band")}${numCell("B21", rates.tariffBand, MONEY0_INPUT)}${note("C21", "£ of capital per tariff band")}</row>`,
    `<row r="22">${label("A22", "Weeks until FPC/FNC awarded")}${intCell("B22", user.weeksUntilFpcFncAwarded, INT_INPUT)}${note("C22", "Personal & nursing care awarded this many weeks after entry")}</row>`,
    `<row r="23">${label("A23", "Care home accepts standard rate?")}${inlineStrCell("B23", yesNo(user.homeAcceptsStandardRate), TEXT_INPUT)}${note("C23", "Yes = no top-up once council-funded; No = resident pays fee minus standard rate")}</row>`,
    `<row r="24">${label("A24", "Date enters care home")}${numCell("B24", excelSerialDate(user.startDate), DATE_INPUT, 0)}${note("C24", "Used for the date column")}</row>`,
    `<row r="25">${label("A25", "Weeks home value is disregarded")}${intCell("B25", place.disregardWeeks, INT_INPUT)}${note("C25", "Weeks the home value is disregarded in the means test")}</row>`,
    `<row r="26">${label("A26", "Computed: effective standard rate")}${formulaCell("B26", 'IF(B14="Yes",B17,B16)', MONEY2_COMPUTED)}${note("C26", "Effective council standard rate (0 where no national rate)")}</row>`,
    `<row r="27">${label("A27", "Computed: top-up per week")}${formulaCell("B27", 'IF(B23="Yes",0,IF(B26>0,B2-B26,0))', MONEY2_COMPUTED)}${note("C27", "Fee minus standard rate (0 if none or home accepts it)")}</row>`,
    `<row r="28">${label("A28", "Capital level triggering means-test review")}${numCell("B28", rates.meansTestThreshold, MONEY0_INPUT)}${note("C28", "£ — council reviews finances here, ahead of taking over subsidy at the upper limit")}</row>`,
    `<row r="29">${label("A29", "Chart duration (years)")}${intCell("B29", user.durationYears, INT_INPUT)}${note("C29", "Model & chart length (years)")}</row>`,
    `<row r="30">${label("A30", "Care home billing period (weeks, paid upfront)")}${intCell("B30", user.billingWeeks, INT_INPUT)}${note("C30", "Care home fees billed every N weeks, paid at the start of each period")}</row>`,
    `<row r="31">${label("A31", "Computed: council funding ceiling")}${formulaCell("B31", "IF(B26>0,B26,B2-B13)", MONEY2_COMPUTED)}${note("C31", "Max the council pays/week (standard rate, or fee minus FNC)")}</row>`,
    `<row r="32">${label("A32", "Care home deposit (weeks, returned at end)")}${intCell("B32", user.depositWeeks, INT_INPUT)}${note("C32", "One-off deposit = N weeks' fee, held (illiquid) and returned in the final week")}</row>`,
    `<row r="33">${label("A33", "Care home prepay weeks (paid up front)")}${intCell("B33", user.prepayWeeks, INT_INPUT)}${note("C33", "Weeks of fees paid up front on entry, before regular billing")}</row>`,
  ];

  const sheetViews = '<sheetView workbookViewId="0"><selection activeCell="A1" sqref="A1" /></sheetView>';
  const cols =
    '<cols><col width="38" customWidth="1" min="1" max="1" /><col width="16" customWidth="1" min="2" max="2" /><col width="72" customWidth="1" min="3" max="3" /></cols>';

  return worksheetXml({ dimension: "A1:C33", sheetViews, cols, sheetData: rows.join("") });
}
