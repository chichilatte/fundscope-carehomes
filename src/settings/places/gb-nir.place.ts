import type { Place, TaxYearRates } from "../../domain/types";
import { assessMeansTested } from "./shared";

const taxYears: TaxYearRates[] = [
  {
    year: "2025/26",
    effectiveFrom: "2025-04-06",
    descriptionId: "note-GB-NIR",
    fpc: 0,
    fnc: 100, // HSC Trust nursing contribution (£/week)
    standardRatePersonal: 0,
    standardRateNursing: 0,
    pea: 34.1,
    upperCapitalLimit: 23250,
    lowerCapitalLimit: 14250,
    meansTestThreshold: 23250,
    tariffPerBand: 1,
    tariffBand: 250,
  },
];

export const gbNir: Place = {
  id: "GB-NIR",
  name: "Northern Ireland",
  disregardWeeks: 12,
  hasStandardRate: false,
  taxYears,
  rules: { assess: assessMeansTested },
};
