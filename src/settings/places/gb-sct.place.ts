import type { AssessmentInput, FundingBreakdown, Place, TaxYearRates } from "../../domain/types";

const taxYears: TaxYearRates[] = [
  {
    year: "2025/26",
    effectiveFrom: "2025-04-06",
    descriptionId: "note-GB-SCT",
    fpc: 260.3,
    fnc: 117.1,
    standardRatePersonal: 930.45,
    standardRateNursing: 1074.13,
    pea: 35.9,
    upperCapitalLimit: 36750,
    lowerCapitalLimit: 22750,
    meansTestThreshold: 60000,
    tariffPerBand: 1.0,
    tariffBand: 250,
  },
];

function assess(input: AssessmentInput): FundingBreakdown {
  const fpc = input.fpcAwarded ? input.rates.fpc : 0;
  const fnc = input.fpcAwarded && input.nursingAwarded ? input.rates.fnc : 0;

  if (input.capital > input.rates.upperCapitalLimit) {
    // Self-funder: FPC/FNC are not means-tested, so the council pays them
    // regardless of capital and the resident pays the remainder of the fee.
    return {
      fpc,
      fnc,
      tariffIncome: 0,
      assessedContribution: 0,
      topUp: 0,
      councilPays: fpc + fnc,
      residentPays: input.fee - fpc - fnc,
      phase: "self-funder",
    };
  }

  // Council-funded. The standard rate already includes FPC/FNC, so the council
  // pays (standard rate − assessed contribution); the resident pays the
  // assessed contribution plus any top-up.
  const overLower = input.capital - input.rates.lowerCapitalLimit;
  const tariffIncome =
    overLower > 0
      ? Math.ceil(overLower / input.rates.tariffBand - 1e-9) * input.rates.tariffPerBand
      : 0;
  const assessedContribution = Math.min(
    input.income - input.rates.pea + tariffIncome,
    input.standardRate,
  );

  return {
    fpc,
    fnc,
    tariffIncome,
    assessedContribution,
    topUp: input.topUp,
    councilPays: input.standardRate - assessedContribution,
    residentPays: assessedContribution + input.topUp,
    phase: input.capital > input.rates.lowerCapitalLimit ? "tariff-band" : "council-full",
  };
}

export const gbSct: Place = {
  id: "GB-SCT",
  name: "Scotland",
  disregardWeeks: 12,
  hasStandardRate: true,
  taxYears,
  rules: { assess },
};
