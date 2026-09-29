import type { AssessmentInput, FundingBreakdown } from "../../domain/types";

/**
 * Means-tested funding rules shared by England, Wales and Northern Ireland.
 *
 * Unlike Scotland, these jurisdictions have no free personal care and no
 * national "council standard rate" — the council (or HSC Trust) funds the care
 * home fee minus the resident's means-tested contribution, plus any
 * non-means-tested nursing contribution (`rates.fnc`, e.g. NHS-FNC in England).
 */
export function assessMeansTested(input: AssessmentInput): FundingBreakdown {
  const fnc = input.fpcAwarded && input.nursingAwarded ? input.rates.fnc : 0;
  const feeAfterNursing = input.fee - fnc;

  if (input.capital > input.rates.upperCapitalLimit) {
    // Self-funder: pays the full fee; the NHS/HSC pays the nursing element.
    return {
      fpc: 0,
      fnc,
      tariffIncome: 0,
      assessedContribution: 0,
      topUp: 0,
      councilPays: fnc,
      residentPays: feeAfterNursing,
      phase: "self-funder",
    };
  }

  // Council/HSC-funded: contribution = income − PEA + tariff income.
  const overLower = input.capital - input.rates.lowerCapitalLimit;
  const tariffIncome =
    overLower > 0
      ? Math.ceil(overLower / input.rates.tariffBand - 1e-9) * input.rates.tariffPerBand
      : 0;
  const assessedContribution = Math.min(
    input.income - input.rates.pea + tariffIncome,
    feeAfterNursing,
  );
  const topUp = input.topUp; // 0 — these jurisdictions have no national standard rate

  return {
    fpc: 0,
    fnc,
    tariffIncome,
    assessedContribution,
    topUp,
    councilPays: feeAfterNursing - assessedContribution,
    residentPays: assessedContribution + topUp,
    phase: input.capital > input.rates.lowerCapitalLimit ? "tariff-band" : "council-full",
  };
}
