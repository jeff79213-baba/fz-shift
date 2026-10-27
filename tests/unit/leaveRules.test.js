import { describe, it, expect } from "vitest";
import { countWeekday, evaluateWarnings } from "../../src/lib/leaveRules.js";

const RULE = { enabled: true, friMax: 1, satMax: 1, sunMax: 1 };

describe("leaveRules", () => {
  it("countWeekday Sunday", () => { expect(countWeekday(["2026-11-01", "2026-11-08", "2026-11-03"], 0)).toBe(2); });
  it("no warnings", () => { expect(evaluateWarnings(["2026-11-06"], { rule: RULE, quota: 3 })).toEqual([]); });
  it("two Sundays warns", () => {
    const w = evaluateWarnings(["2026-11-01", "2026-11-08"], { rule: RULE, quota: 3 });
    expect(w).toHaveLength(1); expect(w[0].type).toBe("weekend"); expect(w[0].weekday).toBe(0); expect(w[0].count).toBe(2);
  });
  it("quota warns", () => {
    const w = evaluateWarnings(["2026-11-03", "2026-11-04", "2026-11-05"], { rule: RULE, quota: 2 });
    expect(w.some(x => x.type === "quota")).toBe(true);
  });
  it("disabled weekend rule skips", () => {
    expect(evaluateWarnings(["2026-11-01", "2026-11-08"], { rule: { enabled: false, friMax: 1, satMax: 1, sunMax: 1 }, quota: 5 })).toEqual([]);
  });
});
