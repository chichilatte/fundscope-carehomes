import { firstOfNextMonthIso } from "./dates";
import type { UserSettings } from "./types";

/** The scenario we've been modelling (example figures). */
export const defaultUserSettings: UserSettings = {
  careHomeFeePerWeek: 2200,
  cashSavings: 50000,
  homeValue: 150000,
  incomePerYear: 20000,
  nursingCareAwarded: false,
  weeksUntilFpcFncAwarded: 10,
  homeAcceptsStandardRate: true,
  startDate: firstOfNextMonthIso(),
  durationYears: 5,
  billingWeeks: 4,
  prepayWeeks: 2,
  depositWeeks: 2,
};
