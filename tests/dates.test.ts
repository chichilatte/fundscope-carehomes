import { describe, expect, it } from "vitest";
import { firstOfNextMonthIso } from "../src/domain/dates";

describe("firstOfNextMonthIso", () => {
  it("returns the first day of next month", () => {
    expect(firstOfNextMonthIso(new Date(2026, 8, 28))).toBe("2026-10-01");
    expect(firstOfNextMonthIso(new Date(2026, 11, 15))).toBe("2027-01-01");
  });

  it("defaults to the current date", () => {
    expect(firstOfNextMonthIso()).toMatch(/^\d{4}-\d{2}-01$/);
  });
});
