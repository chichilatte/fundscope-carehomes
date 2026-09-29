/**
 * Excel serial-date conversion.
 *
 * Excel stores dates as the number of days since 1899-12-30 (day 0). Because
 * Excel incorrectly treats 1900 as a leap year, this epoch aligns with Excel
 * for every date on or after 1900-03-01 — which covers all dates this tool
 * models.
 */

const EXCEL_EPOCH_MS = Date.UTC(1899, 11, 30); // 1899-12-30

/** Convert an ISO date string ("YYYY-MM-DD") to an Excel serial date number. */
export function excelSerialDate(iso: string): number {
  const [year = 1970, month = 1, day = 1] = iso.split("-").map(Number);
  const ms = Date.UTC(year, month - 1, day);
  return Math.round((ms - EXCEL_EPOCH_MS) / 86_400_000);
}
