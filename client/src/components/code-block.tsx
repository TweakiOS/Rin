import { useState } from "react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import {
  base16AteliersulphurpoolLight,
  vscDarkPlus,
} from "react-syntax-highlighter/dist/esm/styles/prism";

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
  dark: boolean;
}

/**
 * Code highlighting via react-syntax-highlighter pulls in refractor, which
 * registers every Prism grammar (~1MB of JS). It lives in its own chunk so
 * articles without code blocks never download it.
 */
export default function MarkdownCodeBlock({ language, code, dark }: MarkdownCodeBlockProps) {
  const [copied, setCopied] = useState(false);

  return (
    <div className="relative group">
      <SyntaxHighlighter
        PreTag="div"
        className="rounded"
        language={language}
        style={dark ? vscDarkPlus : base16AteliersulphurpoolLight}
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
