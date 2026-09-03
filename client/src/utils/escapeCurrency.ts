/**
 * Protect currency dollars (e.g. `$100`, `$5`) from being mis-paired as math
 * by remark-math, which tokenizes `$...$` at the *parse* stage. A stray
 * currency `$` on the same line as a real formula such as `$1+2$` gets
 * mis-paired into a broken math node that crashes KaTeX in the browser
 * ("Cannot use 'in' operator to search for 'children' in undefined").
 *
 * We convert currency dollars to the `&#36;` HTML entity (still renders as a
 * normal `$`) so the markdown parser no longer sees a math delimiter.
 *
 * Rules:
 *  - fenced (```) and inline (`) code are skipped, so `$5` inside code stays
 *    literal
 *  - we only convert `$<number>` when it is NOT the start of a real formula,
 *    i.e. the character after the number is not an arithmetic operator or
 *    another `$` (so `$1+2$`, `$2^3$`, `$x$` are preserved as math)
 */
export function escapeCurrencyDollars(markdown: string): string {
  const CURRENCY = /\\?\$(\d[\d,]*(?:\.\d+)?)(?![+*/=^<>$])/g;
  const escapeProse = (prose: string) => prose.replace(CURRENCY, "&#36;$1");

  let out = "";
  let i = 0;
  const n = markdown.length;
  while (i < n) {
    // fenced code block
    if (markdown.startsWith("```", i)) {
      const end = markdown.indexOf("```", i + 3);
      const stop = end === -1 ? n : end + 3;
      out += markdown.slice(i, stop);
      i = stop;
      continue;
    }
    // inline code span
    if (markdown[i] === "`") {
      const end = markdown.indexOf("`", i + 1);
      const stop = end === -1 ? n : end + 1;
      out += markdown.slice(i, stop);
      i = stop;
      continue;
    }
    const next = markdown.indexOf("`", i);
    const stop = next === -1 ? n : next;
    out += escapeProse(markdown.slice(i, stop));
    i = stop;
  }
  return out;
}
