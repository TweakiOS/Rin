import "katex/dist/katex.min.css";
import React, { cloneElement, isValidElement, lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import type { Pluggable } from "unified";
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import gfm from "remark-gfm";
import remarkMermaid from "../remark/remarkMermaid";
import { remarkAlert } from "remark-github-blockquote-alert";
import remarkMath from "remark-math";
import remarkBreaks from "remark-breaks";
import type { SlideImage } from "yet-another-react-lightbox";
import { drawBlurhashToCanvas } from "../utils/blurhash";
import { useColorMode } from "../utils/darkModeUtils";
import { parseImageUrlMetadata } from "../utils/image-upload";
import { useImageLoadState } from "../utils/use-image-load-state";
import { escapeCurrencyDollars } from "../utils/escapeCurrency";

// Syntax highlighting drags in ~1MB of Prism grammars, so it is split out and
// only fetched when the article actually contains a fenced code block.
const MarkdownCodeBlock = lazy(() => import("./code-block"));
const MarkdownLightbox = lazy(() => import("./markdown-lightbox"));

// Matches the math delimiters remark-math understands: $x$, $$x$$, \(x\), \[x\].
const MATH_PATTERN = /\$[^$\n]+\$|^\s*\$\$|\\\(|\\\[/m;

/** Plain <pre> shown while the highlighter chunk is still downloading. */
function CodeBlockFallback({ code, style }: { code: string, style: React.CSSProperties }) {
  return (
    <div className="relative group">
      <pre
        className="rounded p-4 overflow-x-auto bg-[#eff1f3] dark:bg-[#4a5061]"
        style={{ margin: 0, ...style }}
      >
        <code style={style}>{code}</code>
      </pre>
    </div>
  );
}


const countNewlinesBeforeNode = (text: string, offset: number) => {
  let newlinesBefore = 0;
  for (let i = offset - 1; i >= 0; i--) {
    if (text[i] === "\n") {
      newlinesBefore++;
    } else {
      break;
    }
  }
  return newlinesBefore;
};

const isMarkdownImageLinkAtEnd = (text: string) => {
  const trimmed = text.trim();

  const match = trimmed.match(/(.*)(!\\[.*?\\]\\(.*?\\))$/s);

  if (match) {
    const [, beforeImage, _] = match;

    return beforeImage.trim().length === 0 || beforeImage.endsWith("\n");
  }

  return false;
};

function MarkdownImage({
  src,
  alt,
  show,
  rounded,
  scale,
  className,
}: {
  src?: string;
  alt?: string;
  show: (src?: string) => void;
  rounded: boolean;
  scale: string;
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { src: cleanSrc, blurhash, width, height } = parseImageUrlMetadata(src);
  const { failed, imageRef, loaded, onError, onLoad } = useImageLoadState(cleanSrc);
  const roundedClass = rounded ? "rounded-xl" : "";
  const aspectRatio = width && height ? `${width} / ${height}` : undefined;

  useEffect(() => {
    if (!blurhash || !canvasRef.current) {
      return;
    }
    try {
      drawBlurhashToCanvas(canvasRef.current, blurhash);
    } catch (error) {
      console.error("Failed to render blurhash", error);
    }
  }, [blurhash]);

  return (
    <span
      className={`relative inline-block max-w-full overflow-hidden ${roundedClass}`}
      style={{ zoom: scale, aspectRatio }}
    >
      {blurhash && !loaded ? (
        <canvas
          ref={canvasRef}
          aria-hidden="true"
          className={`absolute inset-0 h-full w-full scale-110 blur-sm ${roundedClass}`}
        />
      ) : null}
      {failed && !blurhash ? (
        <span
          aria-label={alt || undefined}
          role={alt ? "img" : undefined}
          className={`${rounded ? "flex min-h-32 min-w-48" : "inline-flex h-8 w-8"} items-center justify-center bg-neutral-100 text-neutral-400 dark:bg-neutral-800 dark:text-neutral-500 ${roundedClass}`}
        >
          <i className="ri-image-line" aria-hidden="true" />
        </span>
      ) : null}
      <img
        ref={imageRef}
        src={cleanSrc}
        alt={alt}
        width={width}
        height={height}
        onClick={() => {
          show(cleanSrc);
        }}
        onLoad={onLoad}
        onError={onError}
        className={`mx-auto max-w-full cursor-zoom-in transition-opacity ${roundedClass} ${className || ""} ${
          failed ? "hidden" : blurhash && !loaded ? "opacity-0" : "opacity-100"
        }`}
      />
    </span>
  );
}

export function Markdown({ content }: { content: string }) {
  const colorMode = useColorMode();
  const [index, setIndex] = React.useState(-1);
  const [lightboxMounted, setLightboxMounted] = React.useState(false);
  const slides = useRef<SlideImage[]>();

  useEffect(() => {
    slides.current = undefined;
  }, [content]);

  // KaTeX is ~600kB and only a minority of posts use math notation, so the
  // rehype plugin is fetched the first time a post actually needs it.
  const escaped = useMemo(() => escapeCurrencyDollars(content), [content]);
  const [rehypeKatex, setRehypeKatex] = useState<Pluggable | null>(null);
  const hasMath = useMemo(() => MATH_PATTERN.test(escaped), [escaped]);

  useEffect(() => {
    if (!hasMath || rehypeKatex) return;
    let cancelled = false;
    import("rehype-katex")
      .then((module) => {
        // Guard against a non-function default export (CJS/ESM interop quirks
        // in some bundling targets can yield a wrapped module). Feeding an
        // invalid plugin into unified would crash the whole Markdown render.
        if (!cancelled && typeof module.default === "function") {
          setRehypeKatex(module.default);
        }
      })
      .catch(() => {
        // If katex can't load, math just stays as plain text — never crash.
      });
    return () => { cancelled = true; };
  }, [hasMath, rehypeKatex]);

  const rehypePlugins = useMemo<Pluggable[]>(
    () =>
      rehypeKatex
        ? // `output: "html"` avoids emitting MathML (<math>/<semantics>/<annotation>),
          // which React 18's reconciler cannot handle and throws
          // "Cannot use 'in' operator to search for 'children' in undefined".
          [[rehypeKatex, { output: "html" }] as Pluggable, rehypeRaw]
        : [rehypeRaw],
    [rehypeKatex]
  );

  const Content = useMemo(() => (
    <ReactMarkdown
      className="toc-content min-w-0 dark:text-neutral-300 [overflow-wrap:anywhere]"
      remarkPlugins={[gfm, remarkMermaid, remarkMath, remarkAlert, remarkBreaks]}
      children={escaped}
      rehypePlugins={rehypePlugins}
      components={{
        img({ node, src, ...props }) {
          const offset = node!.position!.start.offset!;
          const previousContent = content.slice(0, offset);
          const newlinesBefore = countNewlinesBeforeNode(
            previousContent,
            offset
          );
          const Image = ({
            rounded,
            scale,
          }: {
            rounded: boolean;
            scale: string;
          }) => (
            <MarkdownImage
              src={src}
              alt={props.alt}
              show={show}
              rounded={rounded}
              scale={scale}
              className={props.className}
            />
          );
          if (
            newlinesBefore >= 1 ||
            previousContent.trim().length === 0 ||
            isMarkdownImageLinkAtEnd(previousContent)
          ) {
            return (
              <span className="block w-full text-center my-4">
                <Image scale="0.75" rounded={true} />
              </span>
            );
          } else {
            return (
              <span className="inline-block align-middle mx-1 ">
                <Image scale="0.5" rounded={false} />
              </span>
            );
          }
        },
        code(props) {
          const { children, className, node, ...rest } = props;
          const match = /language-(\w+)/.exec(className || "");

          const curContent = content.slice(node?.position?.start.offset || 0);
          const isCodeBlock = curContent.trimStart().startsWith("```");

          const codeBlockStyle = {
            fontFamily: 'ui-monospace, "SFMono-Regular", "SF Mono", Consolas, "Liberation Mono", Menlo, monospace',
            fontSize: "14px",
            fontVariantLigatures: "normal",
            WebkitFontFeatureSettings: '"liga" 1',
            fontFeatureSettings: '"liga" 1',
          };

          const inlineCodeStyle = {
            ...codeBlockStyle,
            fontSize: "13px",
          };

          const language = match ? match[1] : "";

          if (isCodeBlock) {
            const code = String(children).replace(/\n$/, "");
            return (
              <Suspense fallback={<CodeBlockFallback code={code} style={codeBlockStyle} />}>
                <MarkdownCodeBlock
                  language={language}
                  code={code}
                  dark={colorMode === "dark"}
                />
              </Suspense>
            );
          } else {
            return (
              <code
                {...rest}
                className={`bg-[#eff1f3] dark:bg-[#4a5061] h-[24px] px-[4px] rounded-md mx-[2px] py-[2px] text-neutral-800 dark:text-neutral-300 ${className || ""
                  }`}
                style={inlineCodeStyle}
              >
                {children}
              </code>
            );
          }
        },
        blockquote({ children, ...props }) {
          return (
            <blockquote
              className="border-l-4 border-gray-300 dark:border-gray-500 pl-4 italic text-gray-500 dark:text-gray-400"
              {...props}
            >
              {children}
            </blockquote>
          );
        },
        em({ children, ...props }) {
          return (
            <em className="ml-[1px] mr-[4px]" {...props}>
              {children}
            </em>
          );
        },
        strong({ children, ...props }) {
          return (
            <strong className="mx-[1px]" {...props}>
              {children}
            </strong>
          );
        },

        ul({ children, className, ...props }) {
          const listClass = className?.includes("contains-task-list")
            ? "list-none pl-5"
            : "list-disc pl-5 mt-2";
          return (
            <ul className={listClass} {...props}>
              {children}
            </ul>
          );
        },
        ol({ children, ...props }) {
          return (
            <ol className="list-decimal pl-5" {...props}>
              {children}
            </ol>
          );
        },
        li({ children, ...props }) {
          return (
            <li className="pl-2 py-1" {...props}>
              {children}
            </li>
          );
        },
        a({ children, ...props }) {
          return (
            <a
              className="break-words text-[#0686c8] hover:underline dark:text-[#2590f1] [overflow-wrap:anywhere]"
              {...props}
            >
              {children}
            </a>
          );
        },
        h1({ children, ...props }) {
          return (
            <h1
              id={children?.toString()}
              {...props}
              className={`${props.className || ""} mt-4 break-words text-3xl font-bold [overflow-wrap:anywhere]`.trim()}
              style={{ ...props.style, scrollMarginTop: "var(--header-scroll-offset, 7rem)" }}
            >
              {children}
            </h1>
          );
        },
        h2({ children, ...props }) {
          return (
            <h2
              id={children?.toString()}
              {...props}
              className={`${props.className || ""} mt-4 break-words text-2xl font-bold [overflow-wrap:anywhere]`.trim()}
              style={{ ...props.style, scrollMarginTop: "var(--header-scroll-offset, 7rem)" }}
            >
              {children}
            </h2>
          );
        },
        h3({ children, ...props }) {
          return (
            <h3
              id={children?.toString()}
              {...props}
              className={`${props.className || ""} mt-4 break-words text-xl font-bold [overflow-wrap:anywhere]`.trim()}
              style={{ ...props.style, scrollMarginTop: "var(--header-scroll-offset, 7rem)" }}
            >
              {children}
            </h3>
          );
        },
        h4({ children, ...props }) {
          return (
            <h4
              id={children?.toString()}
              {...props}
              className={`${props.className || ""} mt-4 break-words text-lg font-bold [overflow-wrap:anywhere]`.trim()}
              style={{ ...props.style, scrollMarginTop: "var(--header-scroll-offset, 7rem)" }}
            >
              {children}
            </h4>
          );
        },
        h5({ children, ...props }) {
          return (
            <h5
              id={children?.toString()}
              {...props}
              className={`${props.className || ""} mt-4 break-words text-base font-bold [overflow-wrap:anywhere]`.trim()}
              style={{ ...props.style, scrollMarginTop: "var(--header-scroll-offset, 7rem)" }}
            >
              {children}
            </h5>
          );
        },
        h6({ children, ...props }) {
          return (
            <h6
              id={children?.toString()}
              {...props}
              className={`${props.className || ""} mt-4 break-words text-sm font-bold [overflow-wrap:anywhere]`.trim()}
              style={{ ...props.style, scrollMarginTop: "var(--header-scroll-offset, 7rem)" }}
            >
              {children}
            </h6>
          );
        },
        p({ children, node, ...props }) {
          return (
            <p className="mt-2 break-words py-1 [overflow-wrap:anywhere]" {...props}>
              {children}
            </p>
          );
        },
        hr({ children, ...props }) {
          return <hr className="my-4" {...props} />;
        },
        table: ({ node, className, ...props }) => (
          <div className="md-table-wrap">
            <table className={className} {...props} />
          </div>
        ),
        th: ({ node, className, ...props }) => (
          <th className={className} {...props} />
        ),
        td: ({ node, className, ...props }) => (
          <td className={className} {...props} />
        ),
        sup: ({ children, ...props }) => (
          <sup className="text-xs mr-[4px]" {...props}>
            {children}
          </sup>
        ),
        sub: ({ children, ...props }) => (
          <sub className="text-xs mr-[4px]" {...props}>
            {children}
          </sub>
        ),
        section({ children, ...props }) {
          if (props.hasOwnProperty("data-footnotes")) {
            props.className = `${props.className || ""} mt-8`.trim();
          }
          const modifiedChildren = React.Children.map(children, (child) => {
            if (isValidElement(child) && child.props.node.tagName === "ol") {
              return cloneElement(child, {
                ...child.props,
                className: "list-decimal px-10 text-sm text-[#6B7280]",
              } as React.HTMLAttributes<HTMLParagraphElement>);
            }
            return child;
          });
          return <section {...props}>{modifiedChildren}</section>;
        },
        iframe({ node, src, title, ...props }) {
          return (
            <div className="my-4 w-full">
              <iframe
                {...props}
                src={src}
                title={title || "Embedded content"}
                className="w-full rounded-xl border border-black/10 dark:border-white/10"
                style={{ minHeight: "400px" }}
                loading="lazy"
                referrerPolicy="no-referrer"
                sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
              />
            </div>
          );
        },
        div({ children, node, ...props }) {
          return <div {...props}>{children}</div>;
        },
      }}
    />), [content])



  const show = (src: string | undefined) => {
    let slidesLocal = slides.current;
    if (!slidesLocal) {
      const parent = document.getElementsByClassName("toc-content")[0];
      if (!parent) return;
      const images = parent.querySelectorAll("img");
      slidesLocal = Array.from(images)
        .map((image) => {
          const url = image.getAttribute("src") || "";
          const filename = url.split("/").pop() || "";
          const alt = image.getAttribute("alt") || "";
          return {
            src: url,
            alt: alt,
            imageFit: "contain" as const,
            download: {
              url: url,
              filename: filename,
            },
          };
        })
        .filter((slide) => slide.src !== "");
      slides.current = (slidesLocal);
    }
    const index = slidesLocal?.findIndex((slide) => slide.src === src) ?? -1;
    setIndex(index);
  };

  // Mount the lightbox lazily on the first image click, then keep it mounted so
  // the close animation still plays on subsequent opens.
  useEffect(() => {
    if (index >= 0) setLightboxMounted(true);
  }, [index]);

  return (
    <>
      {Content}
      {lightboxMounted && (
        <Suspense fallback={null}>
          <MarkdownLightbox
            index={index}
            slides={slides.current}
            onClose={() => setIndex(-1)}
          />
        </Suspense>
      )}
    </>
  );
}
