import type { Place, TaxYearRates } from "../../domain/types";
import { assessMeansTested } from "./shared";

const taxYears: TaxYearRates[] = [
  {
    year: "2025/26",
    effectiveFrom: "2025-04-06",
    descriptionId: "note-GB-ENG",
    fpc: 0,
    fnc: 254.06, // NHS-funded nursing care standard rate (£/week)
    standardRatePersonal: 0,
    standardRateNursing: 0,
    pea: 30.15,
    upperCapitalLimit: 23250,
    lowerCapitalLimit: 14250,
    meansTestThreshold: 23250,
    tariffPerBand: 1,
    tariffBand: 250,
  },
];

export const gbEng: Place = {
  id: "GB-ENG",
  name: "England",
  disregardWeeks: 12,
  hasStandardRate: false,
  taxYears,
  rules: { assess: assessMeansTested },
};
