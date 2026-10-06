/**
 * Shared domain types. Pure data — no DOM, no I/O.
 *
 * Amounts are in pounds (GBP). Weeks are 1-indexed: week 1 is the first week
 * after entering care.
 */

export type PlaceId = "GB-SCT" | "GB-ENG" | "GB-WLS" | "GB-NIR";

export type Phase = "self-funder" | "tariff-band" | "council-full";

/** Generic (jurisdiction + tax-year) rates for one tax year. */
export interface TaxYearRates {
  /** Human label, e.g. "2025/26". */
  year: string;
  /** Rates apply from this date (inclusive) — enables per-date tax-year lookup later. */
  effectiveFrom: string; // ISO date "YYYY-MM-DD"
  /** Id of the HTML `<template>` holding this jurisdiction's note copy. */
  descriptionId: string;
  /** Free Personal Care, £/week. */
  fpc: number;
  /** Free Nursing Care, £/week. */
  fnc: number;
  /** Council standard rate without nursing, £/week. */
  standardRatePersonal: number;
  /** Council standard rate including nursing, £/week. */
  standardRateNursing: number;
  /** Personal expenses allowance — income the resident keeps, £/week. */
  pea: number;
  /** Upper capital limit, £. */
  upperCapitalLimit: number;
  /** Lower capital limit, £. */
  lowerCapitalLimit: number;
  /** Capital threshold at which the council starts the means-test review, £. */
  meansTestThreshold: number;
  /** Tariff income per band, £/week. */
  tariffPerBand: number;
  /** Capital band width for tariff income, £. */
  tariffBand: number;
}

/** The funding split for a single week, decided by a place's rules. */
export interface FundingBreakdown {
  fpc: number;
  fnc: number;
  tariffIncome: number;
  assessedContribution: number;
  topUp: number;
  councilPays: number;
  residentPays: number;
  phase: Phase;
}

/** Inputs handed to a place's rules each week. */
export interface AssessmentInput {
  /** Smooth capital (cash + home) at the start of the week. */
  capital: number;
  /** 1-indexed week number. */
  week: number;
  rates: TaxYearRates;
  /** Total weekly income. */
  income: number;
  /** Effective council standard rate for this scenario. */
  standardRate: number;
  /** Weekly top-up (fee − standard rate); 0 if the home accepts the standard rate. */
  topUp: number;
  nursingAwarded: boolean;
  /** Whether FPC/FNC are active this week (week > award delay). */
  fpcAwarded: boolean;
  /** Care-home fee, £/week. */
  fee: number;
}

/** Jurisdiction-specific funding rules. Implemented per place. */
export interface FundingRules {
  assess(input: AssessmentInput): FundingBreakdown;
}

/** A jurisdiction (place): its tax-year rates and its funding rules. */
export interface Place {
  id: PlaceId;
  name: string;
  /** Weeks the home value is disregarded in the means test. */
  disregardWeeks: number;
  /** Whether this jurisdiction has a national council "standard rate" (and a top-up concept). */
  hasStandardRate: boolean;
  taxYears: TaxYearRates[];
  rules: FundingRules;
}

/** User-specific settings (ultimately stored in browser storage). */
export interface UserSettings {
  careHomeFeePerWeek: number;
  cashSavings: number;
  homeValue: number;
  incomePerYear: number;
  nursingCareAwarded: boolean;
  /** Personal/nursing care awarded this many weeks after entering care. */
  weeksUntilFpcFncAwarded: number;
  homeAcceptsStandardRate: boolean;
  /** ISO date "YYYY-MM-DD". */
  startDate: string;
  durationYears: number;
  /** Care-home fees billed every N weeks, paid upfront. */
  billingWeeks: number;
  /** Weeks of fees paid up front on entry, before regular billing. */
  prepayWeeks: number;
  /** One-off deposit in weeks of the care-home fee, held (illiquid) and returned in the final week. */
  depositWeeks: number;
}

/** One week of the simulation, mirroring the Data sheet columns. */
export interface WeeklyRow {
  week: number;
  date: string; // ISO date
  cashStart: number;
  homeStart: number;
  assessedCapitalStart: number;
  totalWealthStart: number;
  fpc: number;
  fnc: number;
  tariffIncome: number;
  assessedContribution: number;
  topUp: number;
  councilPays: number;
  residentPays: number;
  paymentThisWeek: number;
  netChange: number;
  totalWealthEnd: number;
  cashEnd: number;
  homeEnd: number;
  capitalStart: number;
  capitalEnd: number;
  phase: Phase;
}

export interface Milestones {
  /** First week cash runs out (the home must be sold). */
  cashOutWeek: number | null;
  /** First week capital falls to/below the means-test review threshold. */
  meansTestWeek: number | null;
  /** First week capital falls to/below the upper limit (council takes over). */
  councilTakeoverWeek: number | null;
  /** First week capital falls to/below the lower limit. */
  lowerLimitWeek: number | null;
}

export interface SimulationResult {
  weekly: WeeklyRow[];
  milestones: Milestones;
  minCapital: number;
  minCapitalWeek: number;
  finalCapital: number;
  income: number;
  standardRate: number;
  topUp: number;
}
