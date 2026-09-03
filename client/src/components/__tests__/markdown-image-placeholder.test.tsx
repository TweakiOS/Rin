import "../../test/setup";
import { cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "bun:test";
import { Markdown } from "../markdown";

afterEach(() => {
  cleanup();
});

const BLUR = "LEHV6nWB2yk8pyo0adR*.7kCMdnj";
const withBlurhash = `![](https://example.com/a.png#blurhash=${BLUR}&width=800&height=600)`;

function image(container: HTMLElement) {
  return container.querySelector("img") as HTMLImageElement;
}

describe("Markdown image placeholder", () => {
  it("shows the blurhash placeholder while the image is loading", () => {
    const { container } = render(<Markdown content={withBlurhash} />);

    expect(container.querySelector("canvas")).not.toBeNull();
    expect(image(container).className).toContain("opacity-0");
  });

  it("reveals the image once it loads", () => {
    const { container } = render(<Markdown content={withBlurhash} />);

    fireEvent.load(image(container));

    expect(container.querySelector("canvas")).toBeNull();
    expect(image(container).className).toContain("opacity-100");
  });

  it("falls back to an icon when the image fails even though a blurhash exists", () => {
    const { container } = render(<Markdown content={withBlurhash} />);

    fireEvent.error(image(container));

    // Regression: previously the failure was silent whenever the URL carried a
    // blurhash (the image was hidden and only the — possibly blank — canvas was
    // left behind), which looked like an unexplained empty gap.
    expect(container.querySelector(".ri-image-line")).not.toBeNull();
    expect(container.querySelector("canvas")).toBeNull();
    expect(image(container).className).toContain("hidden");
  });

  it("falls back to an icon when the image fails without a blurhash", () => {
    const { container } = render(<Markdown content={"![](https://example.com/b.png)"} />);

    fireEvent.error(image(container));

    expect(container.querySelector(".ri-image-line")).not.toBeNull();
  });
});
