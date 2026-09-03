import type { Plugin } from "unified";
import type { Content, Root } from "mdast";

// Matches a '$' that introduces a currency amount ($100) but NOT one that is
// the closing half of a math expression. The negative lookahead skips any '$'
// that has another '$' later on the same line, i.e. the `$...$` of real math
// like `$1+2$`, so formulas are left untouched for remark-math/katex.
const CURRENCY_DOLLAR = /\$(\d+)(?![^$\n]*\$)/g;

function escapeCurrencyInNode(node: Content) {
  if (node.type === "text") {
    // Fullwidth ＄ (U+FF04): renders as a dollar sign, is not the ASCII '$'
    // that remark-math scans for, so it can never be mis-paired into math —
    // and it is correct CJK typography for currency in prose.
    node.value = node.value.replace(CURRENCY_DOLLAR, "＄$1");
    return;
  }

  // Code is sacred: never touch fenced/inline code, where '$5' etc. are literal.
  if (node.type === "code" || node.type === "inlineCode") {
    return;
  }

  if ("children" in node && Array.isArray(node.children)) {
    node.children.forEach(escapeCurrencyInNode);
  }
}

const remarkEscapeCurrency: Plugin<[], Root> = () => (root: Root) => {
  if (Array.isArray(root.children)) {
    root.children.forEach(escapeCurrencyInNode);
  }
};

export default remarkEscapeCurrency;
