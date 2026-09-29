import { addWeeksISO } from "./dates";
import type {
  Milestones,
  Place,
  SimulationResult,
  TaxYearRates,
  UserSettings,
  WeeklyRow,
} from "./types";

/** Total weekly income — PEA is already included in the income figure. */
export function effectiveIncome(user: UserSettings): number {
  return user.incomePerYear / 52;
}

/** Effective council standard rate, with or without nursing care. */
export function effectiveStandardRate(user: UserSettings, rates: TaxYearRates): number {
  return user.nursingCareAwarded ? rates.standardRateNursing : rates.standardRatePersonal;
}

/** Weekly top-up: fee − standard rate; 0 if the home accepts it or no standard rate applies. */
export function effectiveTopUp(user: UserSettings, standardRate: number): number {
  if (user.homeAcceptsStandardRate || standardRate <= 0) return 0;
  return user.careHomeFeePerWeek - standardRate;
}

/**
 * Run the weekly cashflow simulation.
 *
 * The engine is jurisdiction-agnostic: funding decisions are delegated to the
 * place's `rules`, while capital/cash/home recursion and billing-lump timing
 * live here.
 */
export function simulate(place: Place, rates: TaxYearRates, user: UserSettings): SimulationResult {
  const income = effectiveIncome(user);
  const standardRate = effectiveStandardRate(user, rates);
  const topUp = effectiveTopUp(user, standardRate);
  const weeks = user.durationYears * 52;

  let cash = user.cashSavings;
  let home = user.homeValue;
  let capital = cash + home; // smooth capital used for the means test

  const weekly: WeeklyRow[] = [];
  const milestones: Milestones = {
    cashOutWeek: null,
    meansTestWeek: null,
    councilTakeoverWeek: null,
    lowerLimitWeek: null,
  };
  let minCapital = capital;
  let minCapitalWeek = 0;

  for (let week = 1; week <= weeks; week++) {
    const fpcAwarded = week > user.weeksUntilFpcFncAwarded;
    const breakdown = place.rules.assess({
      capital,
      week,
      rates,
      income,
      standardRate,
      topUp,
      nursingAwarded: user.nursingCareAwarded,
      fpcAwarded,
      fee: user.careHomeFeePerWeek,
    });

    const capitalEnd = Math.max(0, capital + income - breakdown.residentPays);
    // Fees are billed in N-week lumps, paid upfront (first payment in week 1).
    const paymentThisWeek =
      (week - 1) % user.billingWeeks === 0 ? user.billingWeeks * breakdown.residentPays : 0;
    const netChange = income - paymentThisWeek;
    const cashEnd = Math.max(0, cash + netChange);
    const homeEnd = Math.max(0, home + Math.min(0, cash + netChange));

    weekly.push({
      week,
      date: addWeeksISO(user.startDate, week - 1),
      cashStart: cash,
      homeStart: home,
      assessedCapitalStart: cash + (week > place.disregardWeeks ? home : 0),
      totalWealthStart: cash + home,
      fpc: breakdown.fpc,
      fnc: breakdown.fnc,
      tariffIncome: breakdown.tariffIncome,
      assessedContribution: breakdown.assessedContribution,
      topUp: breakdown.topUp,
      councilPays: breakdown.councilPays,
      residentPays: breakdown.residentPays,
      paymentThisWeek,
      netChange,
      totalWealthEnd: cashEnd + homeEnd,
      cashEnd,
      homeEnd,
      capitalStart: capital,
      capitalEnd,
      phase: breakdown.phase,
    });

    if (milestones.councilTakeoverWeek === null && capitalEnd <= rates.upperCapitalLimit) {
      milestones.councilTakeoverWeek = week;
    }
    if (milestones.lowerLimitWeek === null && capital <= rates.lowerCapitalLimit) {
      milestones.lowerLimitWeek = week;
    }
    if (milestones.cashOutWeek === null && cashEnd <= 0) {
      milestones.cashOutWeek = week;
    }
    if (milestones.meansTestWeek === null && capitalEnd <= rates.meansTestThreshold) {
      milestones.meansTestWeek = week;
    }
    if (capitalEnd < minCapital) {
      minCapital = capitalEnd;
      minCapitalWeek = week;
    }

    cash = cashEnd;
    home = homeEnd;
    capital = capitalEnd;
  }

  return {
    weekly,
    milestones,
    minCapital,
    minCapitalWeek,
    finalCapital: capital,
    income,
    standardRate,
    topUp,
  };
}
