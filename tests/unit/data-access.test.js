import { describe, it, expect } from "vitest";
import { buildLeaveDoc, mergeLeaveDates } from "../../src/data-access/leaves.js";

describe("leaves assembly", () => {
  it("buildLeaveDoc", () => {
    const d = buildLeaveDoc("2026-11", "u1", ["2026-11-03"], "draft", "u1");
    expect(d).toMatchObject({ uid: "u1", ym: "2026-11", dates: ["2026-11-03"], status: "draft", updatedBy: "u1" });
  });
  it("mergeLeaveDates sorts & dedupes", () => {
    expect(mergeLeaveDates(["2026-11-05"], "2026-11-03")).toEqual(["2026-11-03", "2026-11-05"]);
  });
});
