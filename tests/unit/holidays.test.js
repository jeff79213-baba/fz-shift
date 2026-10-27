import { describe, it, expect } from "vitest";
import { holidayDatesInMonth, holidayDaysInMonth, quotaForMonth } from "../../src/lib/holidays.js";

describe("holidays", () => {
  it("count 2026-01", () => { expect(holidayDaysInMonth("2026-01")).toBe(1); });
  it("count 2026-04", () => { expect(holidayDaysInMonth("2026-04")).toBe(2); });
  it("empty month", () => { expect(holidayDatesInMonth("2026-03")).toEqual([]); });
  it("override wins", () => { expect(quotaForMonth({ quotaOverride: 5 }, "2026-03")).toBe(5); });
  it("fallback to holidays", () => { expect(quotaForMonth({ quotaOverride: null }, "2026-01")).toBe(1); });
});
