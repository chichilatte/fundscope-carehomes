/**
 * Minimal OpenXML worksheet/cell serialisation helpers.
 *
 * We only need enough of SpreadsheetML to write values and formulas, which
 * keeps the generated XML small and predictable.
 */

const ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&apos;",
};

export function escapeXmlText(value: string): string {
  return value.replace(/[&<>]/g, (c) => ESCAPES[c] ?? c);
}

function round(value: number, dp: number): number {
  const factor = 10 ** dp;
  return Math.round(value * factor) / factor;
}

function numString(value: number, dp: number): string {
  const rounded = round(value, dp);
  return String(Object.is(rounded, -0) ? 0 : rounded);
}

function styleAttr(styleId?: number): string {
  return styleId === undefined ? "" : ` s="${styleId}"`;
}

/** A numeric cell (`t="n"`). */
export function numCell(ref: string, value: number, styleId?: number, dp = 2): string {
  return `<c r="${ref}"${styleAttr(styleId)} t="n"><v>${numString(value, dp)}</v></c>`;
}

/** An integer numeric cell. */
export function intCell(ref: string, value: number, styleId?: number): string {
  return `<c r="${ref}"${styleAttr(styleId)} t="n"><v>${String(Math.round(value))}</v></c>`;
}

/** A formula cell with no cached value (recalculated by the app on open). */
export function formulaCell(ref: string, formula: string, styleId?: number): string {
  return `<c r="${ref}"${styleAttr(styleId)}><f>${escapeXmlText(formula)}</f><v /></c>`;
}

/** A text cell (`t="inlineStr"`). */
export function inlineStrCell(ref: string, text: string, styleId?: number): string {
  return `<c r="${ref}"${styleAttr(styleId)} t="inlineStr"><is><t xml:space="preserve">${escapeXmlText(text)}</t></is></c>`;
}

/** A boolean cell (`t="b"`). */
export function boolCell(ref: string, value: boolean, styleId?: number): string {
  return `<c r="${ref}"${styleAttr(styleId)} t="b"><v>${value ? 1 : 0}</v></c>`;
}

/** An error cell (`t="e"`), e.g. `#N/A`. */
export function errorCell(ref: string, error: string, styleId?: number): string {
  return `<c r="${ref}"${styleAttr(styleId)} t="e"><v>${error}</v></c>`;
}

/** Column number → spreadsheet column letters (1 → "A", 27 → "AA", 31 → "AE"). */
export function colRef(n: number): string {
  let s = "";
  let i = n;
  while (i > 0) {
    const rem = (i - 1) % 26;
    s = String.fromCharCode(65 + rem) + s;
    i = Math.floor((i - 1) / 26);
  }
  return s;
}

const DEFAULT_MARGINS =
  '<pageMargins left="0.75" right="0.75" top="1" bottom="1" header="0.5" footer="0.5" />';

export interface WorksheetParts {
  dimension: string;
  sheetViews: string;
  cols?: string;
  sheetData: string;
  /** Extra XML emitted after `pageMargins` (e.g. a chart drawing anchor). */
  trailing?: string;
}

/** Wrap cell XML in a complete, valid worksheet document. */
export function worksheetXml(parts: WorksheetParts): string {
  return (
    '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
    '<sheetPr><outlinePr summaryBelow="1" summaryRight="1" /><pageSetUpPr /></sheetPr>' +
    `<dimension ref="${parts.dimension}" />` +
    `<sheetViews>${parts.sheetViews}</sheetViews>` +
    '<sheetFormatPr baseColWidth="8" defaultRowHeight="15" />' +
    (parts.cols ?? "") +
    `<sheetData>${parts.sheetData}</sheetData>` +
    DEFAULT_MARGINS +
    (parts.trailing ?? "") +
    "</worksheet>"
  );
}
