import { describe, expect, it } from "vitest";
import { addWeeksISO } from "../src/domain/dates";
import { defaultUserSettings } from "../src/domain/defaults";
import { simulate } from "../src/domain/engine";
import { gbSct } from "../src/settings/places/gb-sct.place";

// Reference values for the default example scenario (single Income field incl. PEA).
const rates = gbSct.taxYears[0]!;

describe("Scotland simulation (2025/26, example scenario)", () => {
  const result = simulate(gbSct, rates, defaultUserSettings);

  it("matches the reference income / standard rate / top-up", () => {
    expect(result.income).toBeCloseTo(384.61538461538464, 10);
    expect(result.standardRate).toBeCloseTo(930.45, 10);
    expect(result.topUp).toBeCloseTo(0, 10);
  });

  it("matches the known milestones", () => {
    expect(result.milestones).toEqual({
      cashOutWeek: 27,
      meansTestWeek: 89,
      councilTakeoverWeek: 104,
      lowerLimitWeek: null,
    });
  });

  it("matches the known capital endpoints", () => {
    expect(result.minCapital).toBeCloseTo(33777.59999999986, 6);
    expect(result.minCapitalWeek).toBe(260);
    expect(result.finalCapital).toBeCloseTo(33777.59999999986, 6);
  });

  it("produces one row per week for the whole duration", () => {
    expect(result.weekly).toHaveLength(5 * 52);
  });

  it("pays the full fee in week 1 (no FPC yet) and the discounted fee from week 11", () => {
    const week1 = result.weekly[0]!;
    expect(week1.residentPays).toBeCloseTo(2200, 6);
    expect(week1.paymentThisWeek).toBeCloseTo(4 * 2200, 6); // 2 weeks prepay + 2 weeks deposit

    const week11 = result.weekly[10]!; // FPC awarded when week > 10
    expect(week11.residentPays).toBeCloseTo(2200 - 260.3, 6);
  });

  it("reports dates one week apart", () => {
    expect(result.weekly[0]!.date).toBe(defaultUserSettings.startDate);
    expect(result.weekly[1]!.date).toBe(addWeeksISO(defaultUserSettings.startDate, 1));
  });
});

describe("top-up scenario (home does not accept the standard rate)", () => {
  const user = { ...defaultUserSettings, homeAcceptsStandardRate: false };
  const result = simulate(gbSct, rates, user);

  it("never lets capital, cash or home fall below zero", () => {
    for (const row of result.weekly) {
      expect(row.capitalEnd).toBeGreaterThanOrEqual(0);
      expect(row.cashEnd).toBeGreaterThanOrEqual(0);
      expect(row.homeEnd).toBeGreaterThanOrEqual(0);
      expect(row.totalWealthEnd).toBeGreaterThanOrEqual(0);
    }
    expect(result.minCapital).toBeGreaterThanOrEqual(0);
  });
});

describe("prepay weeks", () => {
  const user = { ...defaultUserSettings, prepayWeeks: 2, depositWeeks: 0 };
  const result = simulate(gbSct, rates, user);

  it("pays prepayWeeks of fees up front in week 1", () => {
    expect(result.weekly[0]!.paymentThisWeek).toBeCloseTo(2 * 2200, 6);
  });

  it("resumes regular billing after the prepay block", () => {
    expect(result.weekly[2]!.paymentThisWeek).toBeCloseTo(4 * 2200, 6); // week 3: first 4-week lump
  });
});

describe("deposit weeks", () => {
  const user = { ...defaultUserSettings, prepayWeeks: 2, depositWeeks: 2 };
  const result = simulate(gbSct, rates, user);

  it("pays a deposit up front and returns it in the final week", () => {
    const final = result.weekly[result.weekly.length - 1]!;
    expect(result.weekly[0]!.paymentThisWeek).toBeCloseTo(2 * 2200 + 2 * 2200, 6);
    expect(final.paymentThisWeek).toBeCloseTo(-2 * 2200, 6); // refund only
  });

  it("does not change the means-test capital trajectory (deposit is illiquid, not lost)", () => {
    const without = simulate(gbSct, rates, { ...defaultUserSettings, depositWeeks: 0 });
    expect(result.weekly.map((r) => r.capitalEnd)).toEqual(without.weekly.map((r) => r.capitalEnd));
  });
});
