import { describe, it, expect } from "vitest";
import { toEmail, isValidPassword } from "../../src/auth.js";

describe("auth helpers", () => {
  it("toEmail", () => { expect(toEmail("Wang")).toBe("wang@shift.local"); });
  it("valid password", () => { expect(isValidPassword("abcd1234")).toBe(true); });
  it("too short", () => { expect(isValidPassword("a1b2")).toBe(false); });
  it("no digit", () => { expect(isValidPassword("abcdefgh")).toBe(false); });
});
