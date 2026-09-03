import "../../test/setup";
import { cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it } from "bun:test";
import { Markdown } from "../markdown";

afterEach(() => {
  cleanup();
});

describe("Markdown math rendering", () => {
  it("renders inline math through KaTeX (not as a raw language-math code node)", async () => {
    const { container } = render(<Markdown content="公式是 $1+2$ 结束" />);

    // rehype-katex is loaded lazily, so the KaTeX output only appears after
    // the dynamic import settles and the markdown is re-processed.
    await waitFor(() => {
      expect(container.querySelector(".katex")).not.toBeNull();
    });
    expect(container.querySelector("code.language-math")).toBeNull();
  });

  it("renders display math through KaTeX", async () => {
    const { container } = render(<Markdown content={"$$\n\\frac{a}{b}\n$$"} />);

    await waitFor(() => {
      expect(container.querySelector(".katex-display")).not.toBeNull();
    });
    expect(container.querySelector("code.language-math")).toBeNull();
  });

  it("still renders currency amounts as plain text", async () => {
    const { container } = render(<Markdown content="价格是 $100" />);

    expect(container.querySelector(".katex")).toBeNull();
    expect(container.textContent).toContain("$100");
  });
});
