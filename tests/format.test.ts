import { describe, expect, it } from "vitest";
import { formatISODate } from "../src/format/dates";
import { formatGBP, formatGBPWhole } from "../src/format/money";

describe("format", () => {
  it("formats GBP", () => {
    expect(formatGBP(1234.5)).toBe("£1,234.50");
    expect(formatGBPWhole(34377.4)).toBe("£34,377");
  });

  it("formats ISO dates", () => {
    expect(formatISODate("2028-08-03")).toBe("3 Aug 2028");
  });
});
