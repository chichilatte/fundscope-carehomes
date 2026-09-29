const longDate = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

/** Format an ISO date string as a local date, e.g. "3 Aug 2028". */
export function formatISODate(iso: string): string {
  const [year = 0, month = 1, day = 1] = iso.split("-").map(Number);
  return longDate.format(new Date(year, month - 1, day));
}
