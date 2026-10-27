import { describe, it, expect } from "vitest";
import { toCsv, withBom } from "../../src/lib/csv.js";

describe("csv", () => {
  it("quotes and escapes", () => {
    expect(toCsv([["a", 'b,c', 'd"e']])).toBe('a,"b,c","d""e"\r\n');
  });
  it("bom prefix", () => { expect(withBom("x")).toBe("\uFEFFx"); });
});
