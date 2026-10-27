import { describe, it, expect } from "vitest";
import { restByUidFromLeaves, restByUidFromFinals, findConflicts } from "../../src/lib/conflicts.js";

describe("conflicts", () => {
  it("from leaves only submitted", () => {
    const m = restByUidFromLeaves([
      { uid: "a", status: "submitted", dates: ["2026-11-01"] },
      { uid: "b", status: "draft", dates: ["2026-11-01"] },
    ]);
    expect(m.has("a")).toBe(true); expect(m.has("b")).toBe(false);
  });
  it("from finals REST", () => {
    const m = restByUidFromFinals({ "2026-11-01": { a: "REST", b: "early" } });
    expect([...m.get("a")]).toEqual(["2026-11-01"]); expect(m.has("b")).toBe(false);
  });
  it("finds conflict", () => {
    const groups = [{ id: "g1", name: "櫃檯組", memberUids: ["a", "b", "c"] }];
    const rest = new Map([["a", new Set(["2026-11-01"])], ["b", new Set(["2026-11-01"])]]);
    const c = findConflicts(groups, rest);
    expect(c).toHaveLength(1); expect(c[0].date).toBe("2026-11-01"); expect(c[0].uids.sort()).toEqual(["a", "b"]);
  });
  it("no conflict with one", () => {
    const groups = [{ id: "g1", name: "櫃檯組", memberUids: ["a", "b"] }];
    expect(findConflicts(groups, new Map([["a", new Set(["2026-11-01"])]]))).toEqual([]);
  });
});
