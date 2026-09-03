import { describe, expect, it } from "bun:test";
import { escapeCurrencyDollars } from "../escapeCurrency";

describe("escapeCurrencyDollars", () => {
  it("converts currency $ but keeps a real formula as math", () => {
    const input = "remark 渲染实测 $100→＄100、$5(代码块)不动、$1+2$(公式)保留为数学";
    const out = escapeCurrencyDollars(input);
    // currency is escaped to the &#36; entity (still renders as "$")
    expect(out).toContain("&#36;100");
    expect(out).toContain("&#36;5(代码块)");
    // the real formula is preserved untouched
    expect(out).toContain("$1+2$");
    // After escaping, the only ascii "$" chars left are the two formula
    // delimiters ($1+2$), so remark-math can no longer produce a broken node.
    expect((out.match(/\$/g) ?? []).length).toBe(2);
  });

  it("keeps $5 inside an inline code span literal", () => {
    const out = escapeCurrencyDollars("$5 in code: `$5` stays literal");
    expect(out).toContain("`$5`");
  });

  it("keeps $5 inside a fenced code block literal", () => {
    const out = escapeCurrencyDollars("```\n$5 code block unchanged\n```");
    expect(out).toContain("$5 code block");
    expect(out).not.toContain("&#36;5");
  });

  it("preserves formulas with operators and powers", () => {
    const out = escapeCurrencyDollars("formula $1+2$ and power $2^3$ and letter $x$ all kept");
    expect(out).toContain("$1+2$");
    expect(out).toContain("$2^3$");
    expect(out).toContain("$x$");
  });

  it("handles comma- and decimal-grouped currency", () => {
    expect(escapeCurrencyDollars("cost $1,000.50 please")).toContain("&#36;1,000.50");
  });

  it("does not mis-pair currency with a formula on the same line", () => {
    // This is the exact crash scenario: a currency $ before a real formula.
    const out = escapeCurrencyDollars("price $100 and sum $1+2$ here");
    expect(out).toContain("&#36;100");
    expect(out).toContain("$1+2$");
    // After escaping, the only ascii "$" chars left are the formula delimiters,
    // so remark-math can no longer produce a broken math node.
    const asciiDollarCount = (out.match(/\$/g) ?? []).length;
    expect(asciiDollarCount).toBe(2);
  });
});
