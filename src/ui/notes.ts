import type { TaxYearRates } from "../domain/types";
import { formatGBP, formatGBPWhole } from "../format/money";

/** Weekly amount, with any trailing ".00" trimmed ("£100.00" → "£100"). */
const weekly = (value: number): string => formatGBP(value).replace(/\.00$/, "");

/** TaxYearRates fields that are weekly £ amounts (the rest are whole-pound capital figures). */
const WEEKLY_FIELDS = new Set([
  "fpc",
  "fnc",
  "standardRatePersonal",
  "standardRateNursing",
  "pea",
  "tariffPerBand",
]);

function formatField(key: string, rates: TaxYearRates): string {
  const value = (rates as unknown as Record<string, unknown>)[key];
  if (typeof value === "string") return value;
  if (typeof value !== "number") return "";
  return WEEKLY_FIELDS.has(key) ? weekly(value) : formatGBPWhole(value);
}

/**
 * Fill `{{field}}` placeholders in a description template using the whole
 * tax-year entry, e.g. `{{upperCapitalLimit}}` → "£23,250".
 */
export function populateDescription(template: string, rates: TaxYearRates): string {
  return template.replace(/\{\{\s*([A-Za-z0-9_]+)\s*\}\}/g, (_match, key: string) => formatField(key, rates));
}

/** Fill the `#jurisdiction-note` element from the `<template>` named by `rates.descriptionId`. */
export function renderJurisdictionNote(root: HTMLElement, rates: TaxYearRates): void {
  const note = root.querySelector<HTMLElement>("#jurisdiction-note");
  if (!note) return;
  const template = document.getElementById(rates.descriptionId) as HTMLTemplateElement | null;
  note.innerHTML = template ? populateDescription(template.innerHTML, rates) : "";
}
