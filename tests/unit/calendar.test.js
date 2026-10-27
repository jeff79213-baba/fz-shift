import { describe, it, expect } from "vitest";
import { buildMonthGrid } from "../../src/ui/calendar.js";

describe("calendar", () => {
  it("2026-11 grid: first cell is Sunday", () => {
    const g = buildMonthGrid("2026-11");
    const first = g[0].find((c) => c.inMonth);
    expect(first.date).toBe("2026-11-01");
    expect(first.weekday).toBe(0);
  });
  it("includes 30 in-month cells", () => {
    const g = buildMonthGrid("2026-11");
    expect(g.flat().filter((c) => c.inMonth)).toHaveLength(30);
  });
  it("每週都是 7 格", () => {
    for (const ym of ["2026-11", "2026-02", "2028-02"]) {
      expect(buildMonthGrid(ym).every((w) => w.length === 7)).toBe(true);
    }
  });
  it("每月總格數都是 7 的倍數", () => {
    for (const ym of ["2026-11", "2026-12", "2027-02", "2028-02"]) {
      expect(buildMonthGrid(ym).flat().length % 7).toBe(0);
    }
  });
  it("月初為週日時不補前置空格", () => {
    expect(buildMonthGrid("2026-11").flat()[0].date).toBe("2026-11-01");
  });
  it("月初非週日時補前置空格，且尾端補滿", () => {
    // 2026-12-01 為週二 → 前置 2 格；31 天 + 2 格 = 33，補到 35 格
    const flat = buildMonthGrid("2026-12").flat();
    expect(flat.slice(0, 2).every((c) => c.date === null && c.inMonth === false)).toBe(true);
    expect(flat[2].date).toBe("2026-12-01");
    expect(flat[flat.length - 1].date).toBeNull();
  });
  it("閏年 2 月 29 天", () => {
    expect(buildMonthGrid("2028-02").flat().filter((c) => c.inMonth)).toHaveLength(29);
  });
  it("每格的 weekday 與實際星期相符（以 2026-11-01 為週日起算）", () => {
    const flat = buildMonthGrid("2026-11").flat().filter((c) => c.inMonth);
    expect(flat.find((c) => c.date === "2026-11-05").weekday).toBe(4);
    expect(flat.find((c) => c.date === "2026-11-07").weekday).toBe(6);
  });
});
