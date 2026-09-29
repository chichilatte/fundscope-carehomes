/** Adds whole weeks to an ISO date string, returning an ISO date string (UTC-safe). */
export function addWeeksISO(iso: string, weeks: number): string {
  const [year = 0, month = 1, day = 1] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + weeks * 7));
  return date.toISOString().slice(0, 10);
}

/** First day of next month as a local ISO date string (YYYY-MM-DD). */
export function firstOfNextMonthIso(now: Date = new Date()): string {
  const first = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const y = first.getFullYear();
  const m = String(first.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}-01`;
}
