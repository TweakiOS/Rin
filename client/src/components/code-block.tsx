import { useState } from "react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import {
  base16AteliersulphurpoolLight,
  vscDarkPlus,
} from "react-syntax-highlighter/dist/esm/styles/prism";
import { useColorMode } from "../utils/darkModeUtils";

// The bundled Prism themes ship a fixed background (lavender-ish in the light
// theme, near-black in the dark one) that clashes with the site surface and
// never adapts on its own. Override only the block background so it follows
// the site color mode (which tracks the system), matching the inline-code
// and lazy-load fallback colors. Token colors stay from the theme.
const lightStyle = {
  ...base16AteliersulphurpoolLight,
  'pre[class*="language-"]': {
    ...(base16AteliersulphurpoolLight as any)['pre[class*="language-"]'],
    background: "#eff1f3",
  },
};

const darkStyle = {
  ...vscDarkPlus,
  'pre[class*="language-"]': {
    ...(vscDarkPlus as any)['pre[class*="language-"]'],
    background: "#4a5061",
  },
};

const codeBlockStyle = {
  fontFamily: 'ui-monospace, "SFMono-Regular", "SF Mono", Consolas, "Liberation Mono", Menlo, monospace',
  fontSize: "14px",
  fontVariantLigatures: "normal",
  WebkitFontFeatureSettings: '"liga" 1',
  fontFeatureSettings: '"liga" 1',
};

export interface MarkdownCodeBlockProps {
  language: string;
  code: string;
}

/**
 * Code highlighting via react-syntax-highlighter pulls in refractor, which
 * registers every Prism grammar (~1MB of JS). It lives in its own chunk so
 * articles without code blocks never download it.
 */
export default function MarkdownCodeBlock({ language, code }: MarkdownCodeBlockProps) {
  const [copied, setCopied] = useState(false);
  // Subscribe to the color mode here instead of taking a `dark` prop: the
  // markdown tree in `markdown.tsx` is memoized on the source text, so a prop
  // would be frozen on first render and only catch up after a reload. Reading
  // it locally keeps the block in sync when the system scheme changes while
  // avoiding a re-parse of the whole article.
  const colorMode = useColorMode();
  const dark = colorMode === "dark";

  return (
    <div className="relative group">
      <SyntaxHighlighter
        PreTag="div"
        className="rounded"
        language={language}
        style={dark ? darkStyle : lightStyle}
        wrapLongLines={true}
        codeTagProps={{ style: codeBlockStyle }}
      >
        {code}
      </SyntaxHighlighter>
      <button
        className="absolute top-1 right-1 px-2 py-1 bg-w rounded-md text-sm bg-hover select-none invisible group-hover:visible"
        onClick={() => {
          navigator.clipboard.writeText(code);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        }}
      >
        {copied ? "Copied!" : "Copy"}
      </button>
    </div>
  );
}
