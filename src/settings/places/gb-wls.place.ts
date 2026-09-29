import type { Place, TaxYearRates } from "../../domain/types";
import { assessMeansTested } from "./shared";

const taxYears: TaxYearRates[] = [
  {
    year: "2025/26",
    effectiveFrom: "2025-04-06",
    descriptionId: "note-GB-WLS",
    fpc: 0,
    fnc: 0,
    standardRatePersonal: 0,
    standardRateNursing: 0,
    pea: 46.35, // Minimum Income Amount (£/week)
    upperCapitalLimit: 50000,
    lowerCapitalLimit: 50000, // single threshold — no tariff income
    meansTestThreshold: 50000,
    tariffPerBand: 0,
    tariffBand: 250,
  },
];

export const gbWls: Place = {
  id: "GB-WLS",
  name: "Wales",
  disregardWeeks: 12,
  hasStandardRate: false,
  taxYears,
  rules: { assess: assessMeansTested },
};
