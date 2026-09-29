const gbp = new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" });
const gbpWhole = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
  maximumFractionDigits: 0,
});

export function formatGBP(value: number): string {
  return gbp.format(value);
}

export function formatGBPWhole(value: number): string {
  return gbpWhole.format(value);
}
