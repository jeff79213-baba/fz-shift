import { describe, it, expect } from "vitest";
import { holidayDatesInMonth, holidayDaysInMonth, quotaForMonth } from "../../src/lib/holidays.js";

describe("holidays", () => {
  it("count 2026-01", () => { expect(holidayDaysInMonth("2026-01")).toBe(1); });
  it("count 2026-02（春節 5 日＋補假 2/20＋228）", () => { expect(holidayDaysInMonth("2026-02")).toBe(8); });
  it("count 2026-04（兒童節、清明與補假）", () => { expect(holidayDaysInMonth("2026-04")).toBe(4); });
  it("count 2026-05（僅勞動節）", () => { expect(holidayDaysInMonth("2026-05")).toBe(1); });
  it("count 2026-10（國慶與光復節含補假）", () => { expect(holidayDaysInMonth("2026-10")).toBe(4); });
  it("count 2027-02（春節 7 日＋和平紀念日）", () => { expect(holidayDaysInMonth("2027-02")).toBe(8); });
  it("count 2027-03（228 補假落在 3/1）", () => { expect(holidayDaysInMonth("2027-03")).toBe(1); });
  it("count 2027-12（行憲與 2028 元旦補假）", () => { expect(holidayDaysInMonth("2027-12")).toBe(3); });
  it("empty month", () => { expect(holidayDatesInMonth("2026-03")).toEqual([]); });
  it("override wins", () => { expect(quotaForMonth({ quotaOverride: 5 }, "2026-03")).toBe(5); });
  it("fallback to holidays", () => { expect(quotaForMonth({ quotaOverride: null }, "2026-01")).toBe(1); });
});
