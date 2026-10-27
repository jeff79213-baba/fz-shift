import { describe, it, expect } from "vitest";
import { ymOf, parseYm, daysInMonth, weekdayOf, addMonthsYm, formatMD, weekdayZh } from "../../src/lib/dates.js";

describe("dates", () => {
  it("ymOf returns YYYY-MM", () => { expect(ymOf("2026-11-03")).toBe("2026-11"); });
  it("parseYm", () => { expect(parseYm("2026-11")).toEqual({ year: 2026, month: 11 }); });
  it("daysInMonth February leap", () => { expect(daysInMonth("2028-02")).toHaveLength(29); });
  it("daysInMonth November", () => { expect(daysInMonth("2026-11")).toHaveLength(30); });
  it("weekdayOf", () => { expect(weekdayOf("2026-11-01")).toBe(0); }); // 2026-11-01 是週日
  it("addMonthsYm crosses year", () => { expect(addMonthsYm("2026-12", 1)).toBe("2027-01"); });
  it("formatMD", () => { expect(formatMD("2026-11-03")).toBe("11/3"); });
  it("weekdayZh", () => { expect(weekdayZh(0)).toBe("日"); });
});
