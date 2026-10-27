import { describe, it, expect } from "vitest";
import { canStaffEditLeave, isSubmitted, canSeeOthers, isPastDeadline } from "../../src/lib/state.js";

describe("state", () => {
  it("closed blocks staff", () => { expect(canStaffEditLeave("closed")).toBe(false); });
  it("open allows staff", () => { expect(canStaffEditLeave("open")).toBe(true); });
  it("arranging allows staff", () => { expect(canStaffEditLeave("arranging")).toBe(true); });
  it("isSubmitted", () => { expect(isSubmitted({ status: "submitted" })).toBe(true); expect(isSubmitted({ status: "draft" })).toBe(false); });
  it("canSeeOthers only when submitted", () => { expect(canSeeOthers({ status: "submitted" })).toBe(true); expect(canSeeOthers(null)).toBe(false); });
  it("deadline null", () => { expect(isPastDeadline(null, new Date())).toBe(false); });
  it("deadline past", () => { expect(isPastDeadline(new Date("2026-01-01"), new Date("2026-02-01"))).toBe(true); });
});
