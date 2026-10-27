import { describe, it, expect } from "vitest";
import shared from "../../functions/shared.js";

const { normalizePrefix, isShiftEmail, toEmail, isValidPassword } = shared;

describe("function scoping helpers", () => {
  it("normalizePrefix trims and lowercases", () => {
    expect(normalizePrefix(" Wang ")).toBe("wang");
  });
  it("normalizePrefix null-safe", () => {
    expect(normalizePrefix(undefined)).toBe("");
  });
  it("isShiftEmail true for @shift.local", () => {
    expect(isShiftEmail("wang@shift.local")).toBe(true);
  });
  it("isShiftEmail false for external email", () => {
    expect(isShiftEmail("a@gmail.com")).toBe(false);
  });
  it("isShiftEmail null-safe", () => {
    expect(isShiftEmail(null)).toBe(false);
  });
  it("toEmail builds @shift.local address", () => {
    expect(toEmail(" Wang ")).toBe("wang@shift.local");
  });
  it("isValidPassword requires >=8 chars with letters and digits", () => {
    expect(isValidPassword("abc12345")).toBe(true);
    expect(isValidPassword("short1")).toBe(false);
    expect(isValidPassword("abcdefgh")).toBe(false);
    expect(isValidPassword("12345678")).toBe(false);
    expect(isValidPassword(null)).toBe(false);
  });
});
