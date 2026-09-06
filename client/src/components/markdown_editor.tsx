import Editor from "@monaco-editor/react";
import { editor, Range, Selection } from "monaco-editor";
import React, { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import Loading from "react-loading";
import { FlatInset, FlatTabButton } from "@rin/ui";
import { useAlert } from "./dialog";
import { useColorMode } from "../utils/darkModeUtils";
import { buildMarkdownImage, uploadImageFile } from "../utils/image-upload";
import { Markdown } from "./markdown";

interface MarkdownEditorProps {
  content: string;
  setContent: (content: string) => void;
  placeholder?: string;
  height?: string;
}

type TextRange = {
  start: number;
  end: number;
};

function useCoarsePointer() {
  const [coarse, setCoarse] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia("(pointer: coarse)").matches : false,
  );

  useEffect(() => {
    const media = window.matchMedia("(pointer: coarse)");
    const onChange = () => setCoarse(media.matches);
    onChange();
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  return coarse;
}

function neutralizePreviewStyles(markdown: string) {
  return markdown.replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, (block) =>
    block
      .replace(/\bhtml\s*\{/gi, ".rin-preview-root{")
      .replace(/\bbody\s*\{/gi, ".rin-preview-root{")
      .replace(/(^|})\s*\*\s*\{/g, "$1.rin-preview-root *{"),
  );
}

function MarkdownToolButton({
  label,
  icon,
  onClick,
  disabled = false,
}: {
  label: string;
  icon: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-transparent text-lg t-secondary transition-colors hover:border-black/10 hover:bg-neutral-100 hover:text-black focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-theme disabled:cursor-not-allowed disabled:opacity-50 dark:hover:border-white/10 dark:hover:bg-neutral-700 dark:hover:text-white sm:h-10 sm:w-10"
    >
      <i className={icon} aria-hidden="true" />
      <span className="sr-only">{label}</span>
    </button>
  );
}

export function MarkdownEditor({
  content,
  setContent,
  placeholder = "> Write your content here...",
  height = "400px",
}: MarkdownEditorProps) {
  const { t } = useTranslation();
  const colorMode = useColorMode();
  const useNativeEditor = useCoarsePointer();
  const editorRef = useRef<editor.IStandaloneCodeEditor>();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isComposingRef = useRef(false);
  const pendingSelectionRef = useRef<TextRange | null>(null);
  const [preview, setPreview] = useState<"edit" | "preview" | "comparison">("edit");
  const [uploading, setUploading] = useState(false);
  const { showAlert, AlertUI } = useAlert();

  const showSource = preview !== "preview";
  const showPreview = preview !== "edit";

  const getValue = () => {
    if (useNativeEditor) {
      return textareaRef.current?.value ?? content;
    }
    return editorRef.current?.getModel()?.getValue() ?? content;
  };

  const getSelectionOffsets = (): TextRange => {
    if (useNativeEditor) {
      const textarea = textareaRef.current;
      if (!textarea) {
        return { start: content.length, end: content.length };
      }
      const start = Math.min(textarea.selectionStart, textarea.selectionEnd);
      const end = Math.max(textarea.selectionStart, textarea.selectionEnd);
      return { start, end };
    }

    const editorInstance = editorRef.current;
    const model = editorInstance?.getModel();
    const selection = editorInstance?.getSelection();
    if (!editorInstance || !model || !selection) {
      const value = getValue();
      return { start: value.length, end: value.length };
    }

    const start = model.getOffsetAt({
      lineNumber: selection.startLineNumber,
      column: selection.startColumn,
    });
    const end = model.getOffsetAt({
      lineNumber: selection.endLineNumber,
      column: selection.endColumn,
    });
    return start <= end ? { start, end } : { start: end, end: start };
  };

  const applySelection = (range: TextRange) => {
    if (useNativeEditor) {
      const textarea = textareaRef.current;
      if (!textarea) return;
      textarea.focus();
      textarea.setSelectionRange(range.start, range.end);
      return;
    }

    const editorInstance = editorRef.current;
    const model = editorInstance?.getModel();
    if (!editorInstance || !model) return;

    const start = model.getPositionAt(range.start);
    const end = model.getPositionAt(range.end);
    editorInstance.setSelection(
      new Selection(start.lineNumber, start.column, end.lineNumber, end.column),
    );
    editorInstance.revealRangeInCenterIfOutsideViewport(
      new Range(start.lineNumber, start.column, end.lineNumber, end.column),
    );
    editorInstance.focus();
  };

  const replaceRange = (start: number, end: number, text: string, next?: TextRange) => {
    const nextSelection = next ?? { start: start + text.length, end: start + text.length };

    if (useNativeEditor) {
      const current = getValue();
      const nextValue = `${current.slice(0, start)}${text}${current.slice(end)}`;
      pendingSelectionRef.current = nextSelection;
      setContent(nextValue);
      requestAnimationFrame(() => {
        const pending = pendingSelectionRef.current;
        if (!pending) return;
        applySelection(pending);
        pendingSelectionRef.current = null;
      });
      return;
    }

    const editorInstance = editorRef.current;
    const model = editorInstance?.getModel();
    if (!editorInstance || !model) return;

    const startPosition = model.getPositionAt(start);
    const endPosition = model.getPositionAt(end);
    editorInstance.executeEdits("markdown-toolbar", [
      {
        range: new Range(
          startPosition.lineNumber,
          startPosition.column,
          endPosition.lineNumber,
          endPosition.column,
        ),
        text,
        forceMoveMarkers: true,
      },
    ]);
    setContent(editorInstance.getValue());
    applySelection(nextSelection);
  };

  const wrapSelection = (prefix: string, suffix: string, fallback: string) => {
    const { start, end } = getSelectionOffsets();
    const selectedText = getValue().slice(start, end);
    const innerText = selectedText || fallback;
    const insertedText = `${prefix}${innerText}${suffix}`;
    const innerStart = start + prefix.length;
    const innerEnd = innerStart + innerText.length;
    replaceRange(
      start,
      end,
      insertedText,
      selectedText
        ? { start: start + insertedText.length, end: start + insertedText.length }
        : { start: innerStart, end: innerEnd },
    );
  };

  const insertLink = () => {
    const { start, end } = getSelectionOffsets();
    const selectedText = getValue().slice(start, end);
    const label = selectedText || t("markdown_editor.placeholder.link_text");
    const url = t("markdown_editor.placeholder.link_url");
    const prefix = `[${label}](`;
    const insertedText = `${prefix}${url})`;
    const urlStart = start + prefix.length;
    replaceRange(start, end, insertedText, {
      start: urlStart,
      end: urlStart + url.length,
    });
  };

  const insertMarkdownImage = () => {
    const { start, end } = getSelectionOffsets();
    const selectedText = getValue().slice(start, end);
    const alt = selectedText || t("markdown_editor.placeholder.image_alt");
    const url = t("markdown_editor.placeholder.image_url");
    const prefix = `![${alt}](`;
    const insertedText = `${prefix}${url})`;
    const urlStart = start + prefix.length;
    replaceRange(start, end, insertedText, {
      start: urlStart,
      end: urlStart + url.length,
    });
  };

  const insertCodeBlock = () => {
    const { start, end } = getSelectionOffsets();
    const selectedText = getValue().slice(start, end);
    const innerText = selectedText || t("markdown_editor.placeholder.code_block");
    const prefix = "```\n";
    const insertedText = `${prefix}${innerText}\n\`\`\``;
    const innerStart = start + prefix.length;
    replaceRange(
      start,
      end,
      insertedText,
      selectedText
        ? { start: start + insertedText.length, end: start + insertedText.length }
        : { start: innerStart, end: innerStart + innerText.length },
    );
  };

  const insertHorizontalRule = () => {
    const { start, end } = getSelectionOffsets();
    replaceRange(start, end, "\n---\n");
  };

  const formatSelectedLines = (
    formatter: (line: string, index: number) => string,
    emptyLineFallback: string,
  ) => {
    const value = getValue();
    const selection = getSelectionOffsets();
    const lineStart = value.lastIndexOf("\n", selection.start - 1) + 1;
    const endsAtLineStart = selection.end > selection.start && value[selection.end - 1] === "\n";
    const rawEnd = endsAtLineStart ? selection.end - 1 : selection.end;
    const lineEndLookup = value.indexOf("\n", rawEnd);
    const lineEnd = lineEndLookup === -1 ? value.length : lineEndLookup;
    const block = value.slice(lineStart, lineEnd);
    const isEmptySingleLine = selection.start === selection.end && block.trim().length === 0;
    const sourceLines = isEmptySingleLine ? [emptyLineFallback] : block.split("\n");
    const insertedText = sourceLines.map((line, index) => formatter(line, index)).join("\n");
    replaceRange(lineStart, lineEnd, insertedText, {
      start: lineStart + insertedText.length,
      end: lineStart + insertedText.length,
    });
  };

  const formatHeading = () => {
    formatSelectedLines(
      (line) => (line.startsWith("#") ? `## ${line.replace(/^#+\s*/, "")}` : `## ${line}`),
      `## ${t("markdown_editor.placeholder.heading")}`,
    );
  };

  const formatQuote = () => {
    formatSelectedLines(
      (line) => (line.startsWith("> ") ? line : `> ${line}`),
      `> ${t("markdown_editor.placeholder.quote")}`,
    );
  };

  const formatUnorderedList = () => {
    formatSelectedLines(
      (line) => (line.match(/^\s*[-*]\s/) ? line : `- ${line}`),
      `- ${t("markdown_editor.placeholder.list_item")}`,
    );
  };

  const formatOrderedList = () => {
    formatSelectedLines(
      (line, index) => (line.match(/^\s*\d+\.\s/) ? line : `${index + 1}. ${line}`),
      `1. ${t("markdown_editor.placeholder.list_item")}`,
    );
  };

  const formatTable = () => {
    const value = getValue();
    const { start, end } = getSelectionOffsets();
    const range = findMarkdownTableRange(value, start, end);
    if (!range) {
      showAlert(t("markdown_editor.table.not_found"));
      return;
    }

    const html = markdownTableToHtml(value.slice(range.start, range.end));
    if (!html) {
      showAlert(t("markdown_editor.table.invalid"));
      return;
    }

    replaceRange(range.start, range.end, html);
  };

  const clearTableFormat = () => {
    const value = getValue();
    const { start, end } = getSelectionOffsets();
    const range = findHtmlTableRange(value, start, end);
    if (!range) {
      showAlert(t("markdown_editor.table.html_not_found"));
      return;
    }

    const markdown = htmlTableToMarkdown(value.slice(range.start, range.end));
    if (!markdown) {
      showAlert(t("markdown_editor.table.html_invalid"));
      return;
    }

    replaceRange(range.start, range.end, markdown);
  };

  const handleSelectAll = () => {
    const value = getValue();
    applySelection({ start: 0, end: value.length });
  };

  const insertImageAtSelection = async (file: File, range = getSelectionOffsets()) => {
    try {
      const result = await uploadImageFile(file);
      replaceRange(
        range.start,
        range.end,
        buildMarkdownImage(file.name, result.url, {
          blurhash: result.blurhash,
          width: result.width,
          height: result.height,
        }),
      );
    } catch (error) {
      console.error(error);
      showAlert(error instanceof Error ? error.message : t("upload.failed"));
    }
  };

  const uploadFiles = (files: FileList | File[]) => {
    const list = Array.from(files);
    if (list.length === 0) return;

    const range = getSelectionOffsets();
    setUploading(true);
    void Promise.all(
      list.map((file) => {
        if (file.size > 5 * 1024000) {
          showAlert(t("upload.failed$size", { size: 5 }));
          return Promise.resolve();
        }
        return insertImageAtSelection(file, range);
      }),
    ).finally(() => {
      setUploading(false);
    });
  };

  const markdownActions = [
    { key: "select-all", icon: "ri-text-wrap", label: t("markdown_editor.toolbar.select_all"), onClick: handleSelectAll },
    { key: "heading", icon: "ri-heading", label: t("markdown_editor.toolbar.heading"), onClick: formatHeading },
    { key: "bold", icon: "ri-bold", label: t("markdown_editor.toolbar.bold"), onClick: () => wrapSelection("**", "**", t("markdown_editor.placeholder.bold")) },
    { key: "italic", icon: "ri-italic", label: t("markdown_editor.toolbar.italic"), onClick: () => wrapSelection("*", "*", t("markdown_editor.placeholder.italic")) },
    { key: "link", icon: "ri-link", label: t("markdown_editor.toolbar.link"), onClick: insertLink },
    { key: "image", icon: "ri-image-line", label: t("markdown_editor.toolbar.image"), onClick: insertMarkdownImage },
    { key: "quote", icon: "ri-double-quotes-l", label: t("markdown_editor.toolbar.quote"), onClick: formatQuote },
    { key: "unordered-list", icon: "ri-list-unordered", label: t("markdown_editor.toolbar.unordered_list"), onClick: formatUnorderedList },
    { key: "ordered-list", icon: "ri-list-ordered", label: t("markdown_editor.toolbar.ordered_list"), onClick: formatOrderedList },
    { key: "inline-code", icon: "ri-code-s-slash-line", label: t("markdown_editor.toolbar.inline_code"), onClick: () => wrapSelection("`", "`", t("markdown_editor.placeholder.code")) },
    { key: "code-block", icon: "ri-code-box-line", label: t("markdown_editor.toolbar.code_block"), onClick: insertCodeBlock },
    { key: "horizontal-rule", icon: "ri-separator", label: t("markdown_editor.toolbar.horizontal_rule"), onClick: insertHorizontalRule },
    { key: "format-table", icon: "ri-table-2", label: t("markdown_editor.toolbar.format_table"), onClick: formatTable },
    { key: "clear-table-format", icon: "ri-format-clear", label: t("markdown_editor.toolbar.clear_table_format"), onClick: clearTableFormat },
  ];

  function UploadImageButton() {
    const uploadRef = useRef<HTMLInputElement>(null);
    const label = t("markdown_editor.toolbar.upload_image");

    const upChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = event.currentTarget.files;
      if (!files) return;
      uploadFiles(files);
      event.currentTarget.value = "";
    };

    return (
      <>
        <input ref={uploadRef} type="file" accept="image/*" className="hidden" onChange={upChange} />
        <MarkdownToolButton
          label={label}
          icon="ri-image-add-line"
          disabled={uploading}
          onClick={() => uploadRef.current?.click()}
        />
      </>
    );
  }

  const handlePaste = (event: React.ClipboardEvent<HTMLElement>) => {
    const files = event.clipboardData?.files;
    if (!files || files.length === 0) return;

    const imageFiles = Array.from(files).filter((file) => file.type.startsWith("image/"));
    if (imageFiles.length === 0) return;

    event.preventDefault();
    if (!useNativeEditor) {
      editorRef.current?.trigger(undefined, "undo", undefined);
    }
    uploadFiles(imageFiles);
  };

  const handleEditorMount = (ed: editor.IStandaloneCodeEditor) => {
    editorRef.current = ed;

    ed.onDidCompositionStart(() => {
      isComposingRef.current = true;
    });

    ed.onDidCompositionEnd(() => {
      isComposingRef.current = false;
      setContent(ed.getValue());
    });

    ed.onDidChangeModelContent(() => {
      if (!isComposingRef.current) {
        setContent(ed.getValue());
      }
    });

    ed.onDidBlurEditorText(() => {
      setContent(ed.getValue());
    });
  };

  useEffect(() => {
    if (useNativeEditor) return;
    const editorInstance = editorRef.current;
    const model = editorInstance?.getModel();
    if (!editorInstance || !model) return;
    if (model.getValue() !== content) {
      editorInstance.setValue(content);
    }
  }, [content, useNativeEditor]);

  useEffect(() => {
    if (useNativeEditor && preview === "comparison") {
      setPreview("edit");
    }
  }, [preview, useNativeEditor]);

  return (
    <div className="flex flex-col gap-0 sm:gap-3">
      <FlatInset className="sticky top-0 z-10 flex flex-wrap items-center gap-1 border-0 border-b border-black/10 rounded-none bg-w p-1.5 dark:border-white/10 sm:static sm:gap-2 sm:p-3">
        <div className="flex shrink-0 flex-wrap items-center gap-1">
          <FlatTabButton active={preview === "edit"} onClick={() => setPreview("edit")}>
            {t("edit")}
          </FlatTabButton>
          <FlatTabButton active={preview === "preview"} onClick={() => setPreview("preview")}>
            {t("preview")}
          </FlatTabButton>
          {!useNativeEditor && (
            <FlatTabButton active={preview === "comparison"} onClick={() => setPreview("comparison")}>
              {t("comparison")}
            </FlatTabButton>
          )}
        </div>
        <div className="flex-grow" />
        <div
          className="flex min-w-0 flex-wrap items-center gap-1"
          role="toolbar"
          aria-label={t("markdown_editor.toolbar.label")}
        >
          {markdownActions.map((action) => (
            <MarkdownToolButton
              key={action.key}
              label={action.label}
              icon={action.icon}
              onClick={action.onClick}
            />
          ))}
          <span className="mx-1 hidden h-6 w-px bg-black/10 dark:bg-white/10 sm:block" aria-hidden="true" />
          <UploadImageButton />
        </div>
        {uploading && (
          <div className="flex flex-row items-center space-x-2 px-2">
            <Loading type="spin" color="#FC466B" height={16} width={16} />
            <span className="text-sm text-neutral-500">{t("uploading")}</span>
          </div>
        )}
      </FlatInset>
      <div className={`grid grid-cols-1 gap-0 sm:gap-4 ${preview === "comparison" ? "lg:grid-cols-2" : ""}`}>
        {showSource && (
          <div className="flex min-w-0 flex-col">
            <div
              className="relative min-h-0 overflow-visible rounded-none border-0 bg-w"
              onDragOver={(event) => {
                event.preventDefault();
              }}
              onDrop={(event) => {
                event.preventDefault();
                if (event.dataTransfer.files.length > 0) {
                  uploadFiles(event.dataTransfer.files);
                }
              }}
              onPaste={handlePaste}
            >
              {useNativeEditor ? (
                <textarea
                  ref={textareaRef}
                  value={content}
                  placeholder={placeholder}
                  spellCheck
                  autoCapitalize="sentences"
                  autoCorrect="on"
                  autoComplete="on"
                  onChange={(event) => setContent(event.target.value)}
                  style={{ height }}
                  className="box-border min-h-[60dvh] w-full resize-y bg-transparent px-3 py-3 text-base leading-7 t-primary outline-none sm:px-4 [overflow-wrap:anywhere] [user-select:text] [-webkit-user-select:text]"
                />
              ) : (
                <Editor
                  onMount={handleEditorMount}
                  height={height}
                  defaultLanguage="markdown"
                  defaultValue={content}
                  theme={colorMode === "dark" ? "vs-dark" : "light"}
                  options={{
                    wordWrap: "on",
                    fontFamily: "Sarasa Mono SC, JetBrains Mono, monospace",
                    fontLigatures: false,
                    letterSpacing: 0,
                    fontSize: 14,
                    lineNumbers: "off",
                    minimap: { enabled: false },
                    folding: false,
                    glyphMargin: false,
                    accessibilitySupport: "auto",
                    unicodeHighlight: { ambiguousCharacters: false },
                    renderWhitespace: "none",
                    renderControlCharacters: false,
                    smoothScrolling: false,
                    dragAndDrop: true,
                    pasteAs: { enabled: false },
                    contextmenu: false,
                    quickSuggestions: false,
                    suggestOnTriggerCharacters: false,
                  }}
                />
              )}
            </div>
          </div>
        )}
        {showPreview && (
          <div
            className="rin-preview-root min-h-0 overflow-y-auto rounded-none border-0 border-t bg-w px-3 py-3 sm:border-none sm:px-4 sm:py-4"
            style={{ height }}
          >
            <Markdown content={neutralizePreviewStyles(content || placeholder)} />
          </div>
        )}
      </div>
      <AlertUI />
    </div>
  );
}

type Align = "left" | "right" | "center";

function splitMarkdownRow(line: string): string[] {
  const trimmed = line.trim().replace(/^\|/, "").replace(/\|$/, "");
  return trimmed.split("|").map((cell) => cell.trim());
}

function isSeparatorRow(line: string): boolean {
  const cells = splitMarkdownRow(line);
  return cells.length > 0 && cells.every((cell) => /^:?-{3,}:?$/.test(cell.replace(/\s/g, "")));
}

function alignFromSeparator(cell: string): Align {
  const value = cell.trim();
  if (value.startsWith(":") && value.endsWith(":")) return "center";
  if (value.endsWith(":")) return "right";
  return "left";
}

function stripTags(value: string): string {
  return value.replace(/<[^>]+>/g, "");
}

function looksNumeric(value: string): boolean {
  const text = stripTags(value).trim();
  if (!text || text === "—" || text === "-" || text === "–") return true;
  return /^[+\-−]?\$?\d[\d,]*(?:\.\d+)?%?$/.test(text);
}

function isEmptyCell(value: string): boolean {
  const text = stripTags(value).trim();
  return !text || text === "—" || text === "-" || text === "–" || text === "N/A";
}

function findMarkdownTableRange(text: string, from: number, to: number): { start: number; end: number } | null {
  const lines = text.split("\n");
  const offsets: number[] = [];
  let cursor = 0;
  for (const line of lines) {
    offsets.push(cursor);
    cursor += line.length + 1;
  }

  const lineAt = (offset: number) => {
    let index = 0;
    for (let i = 0; i < offsets.length; i++) {
      if (offsets[i] <= offset) index = i;
    }
    return index;
  };

  let startLine = lineAt(from);
  let endLine = lineAt(Math.max(from, to - 1));

  const isTableLine = (line: string) => {
    const trimmed = line.trim();
    return trimmed.includes("|") && !trimmed.startsWith("```");
  };

  while (startLine > 0 && isTableLine(lines[startLine - 1])) startLine--;
  while (endLine + 1 < lines.length && isTableLine(lines[endLine + 1])) endLine++;

  const block = lines.slice(startLine, endLine + 1).filter((line) => line.trim().length > 0);
  if (block.length < 2 || !isSeparatorRow(block[1])) return null;

  const start = offsets[startLine];
  const last = lines[endLine];
  const end = offsets[endLine] + last.length;
  return { start, end };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function unescapeHtml(value: string): string {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'");
}

function inlineMarkdownToHtml(value: string): string {
  let text = escapeHtml(value);

  text = text.replace(/\*\*(?=\S)([\s\S]*?\S)\*\*/g, "<strong>$1</strong>");
  text = text.replace(/__(?=\S)([\s\S]*?\S)__/g, "<strong>$1</strong>");
  text = text.replace(/(^|[^\w*])\*(?=\S)([^*\n]*?\S)\*(?!\*)/g, "$1<em>$2</em>");
  text = text.replace(/(^|[^\w_])_(?=\S)([^_\n]*?\S)_(?!_)/g, "$1<em>$2</em>");
  text = text.replace(/`([^`]+)`/g, "<code>$1</code>");

  return text;
}

function htmlInlineToMarkdown(raw: string): string {
  let text = raw;

  text = text.replace(/<(strong|b)\b[^>]*>([\s\S]*?)<\/\1>/gi, "**$2**");
  text = text.replace(/<(em|i)\b[^>]*>([\s\S]*?)<\/\1>/gi, "*$2*");
  text = text.replace(/<code\b[^>]*>([\s\S]*?)<\/code>/gi, "`$1`");
  text = text.replace(/<span\b[^>]*class=["'][^"']*\b(?:up|down)\b[^"']*["'][^>]*>([\s\S]*?)<\/span>/gi, "$1");
  text = text.replace(/<br\s*\/?>/gi, " ");
  text = text.replace(/<[^>]+>/g, "");

  text = unescapeHtml(text)
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!text || text === "—" || text === "–" || text === "-" || text === "N/A") {
    return "";
  }

  return text.replace(/\|/g, "\\|");
}

function colorizeCell(value: string): string {
  const text = stripTags(value).trim();
  if (/^[+＋]/.test(text)) return `<span class="up">${value}</span>`;
  if (/^[-−]/.test(text) || text.startsWith("-$") || text.startsWith("−$")) {
    return `<span class="down">${value}</span>`;
  }
  return value;
}

function markdownTableToHtml(markdown: string): string | null {
  const lines = markdown
    .split("\n")
    .map((line) => line.trimEnd())
    .filter((line) => line.trim().length > 0);

  if (lines.length < 2 || !isSeparatorRow(lines[1])) return null;

  const headers = splitMarkdownRow(lines[0]);
  const separators = splitMarkdownRow(lines[1]);
  const rows = lines.slice(2).map(splitMarkdownRow);
  if (headers.length === 0) return null;

  const columnCount = headers.length;
  const aligns: Align[] = headers.map((_, index) => {
    if (separators[index]) return alignFromSeparator(separators[index]);
    if (index === 0) return "left";
    const columnValues = rows.map((row) => row[index] || "");
    return columnValues.every(looksNumeric) ? "right" : "left";
  });

  const padRow = (row: string[]) =>
    Array.from({ length: columnCount }, (_, index) => row[index] ?? "");

  const classFor = (index: number, empty = false) => {
    const parts = [
      aligns[index] === "right" ? "col-num" : "",
      empty ? "is-empty" : "",
    ].filter(Boolean);
    return parts.length ? ` class="${parts.join(" ")}"` : "";
  };

  const headerHtml = padRow(headers)
    .map((cell, index) => `<th${classFor(index)}>${inlineMarkdownToHtml(cell || "")}</th>`)
    .join("\n        ");

  const bodyHtml = rows
    .map((row) => {
      const cells = padRow(row)
        .map((cell, index) => {
          const raw = cell.trim() ? cell : "—";
          const value = inlineMarkdownToHtml(raw);
          return `<td${classFor(index, isEmptyCell(raw))}>${colorizeCell(value)}</td>`;
        })
        .join("\n        ");
      return `      <tr>\n        ${cells}\n      </tr>`;
    })
    .join("\n");

  return `<div class="md-table-wrap">
  <table>
    <thead>
      <tr>
        ${headerHtml}
      </tr>
    </thead>
    <tbody>
${bodyHtml}
    </tbody>
  </table>
</div>`;
}

function findHtmlTableRange(text: string, from: number, to: number): { start: number; end: number } | null {
  const pattern = /(?:<div\b[^>]*>\s*)?<table\b[\s\S]*?<\/table>(?:\s*<\/div>)?/gi;
  const cursor = from;
  const selectionEnd = Math.max(from, to);
  let containing: { start: number; end: number } | null = null;
  let nearestBefore: { start: number; end: number } | null = null;
  let nearestAfter: { start: number; end: number } | null = null;

  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text)) !== null) {
    const start = match.index;
    const end = start + match[0].length;
    if (cursor >= start && selectionEnd <= end) {
      return { start, end };
    }
    if (cursor >= start && cursor <= end) {
      containing = { start, end };
    }
    if (end <= cursor) {
      nearestBefore = { start, end };
    } else if (!nearestAfter && start >= selectionEnd) {
      nearestAfter = { start, end };
    }
  }

  return containing ?? nearestBefore ?? nearestAfter;
}

function htmlCellText(raw: string): string {
  return htmlInlineToMarkdown(raw);
}

function alignFromHtmlCell(raw: string): Align {
  if (/\bcol-num\b/.test(raw)) return "right";
  const styleMatch = raw.match(/text-align\s*:\s*(left|right|center)/i);
  if (styleMatch) return styleMatch[1].toLowerCase() as Align;
  const attrMatch = raw.match(/\balign\s*=\s*["']?(left|right|center)["']?/i);
  if (attrMatch) return attrMatch[1].toLowerCase() as Align;
  return "left";
}

function extractHtmlRowCells(rowHtml: string): { text: string; align: Align }[] {
  const cells: { text: string; align: Align }[] = [];
  const cellPattern = /<(th|td)\b([^>]*)>([\s\S]*?)<\/\1>/gi;
  let match: RegExpExecArray | null;
  while ((match = cellPattern.exec(rowHtml)) !== null) {
    const attrs = match[2] || "";
    const inner = match[3] || "";
    cells.push({
      text: htmlCellText(inner),
      align: alignFromHtmlCell(`${attrs} ${inner}`),
    });
  }
  return cells;
}

function htmlTableToMarkdown(html: string): string | null {
  const tableMatch = html.match(/<table\b[\s\S]*?<\/table>/i);
  if (!tableMatch) return null;

  const rows: { text: string; align: Align }[][] = [];
  const rowPattern = /<tr\b[^>]*>([\s\S]*?)<\/tr>/gi;
  let match: RegExpExecArray | null;
  while ((match = rowPattern.exec(tableMatch[0])) !== null) {
    const cells = extractHtmlRowCells(match[1] || "");
    if (cells.length > 0) rows.push(cells);
  }

  if (rows.length === 0) return null;

  const columnCount = Math.max(...rows.map((row) => row.length));
  if (columnCount === 0) return null;

  const pad = (row: { text: string; align: Align }[]) =>
    Array.from({ length: columnCount }, (_, index) => row[index] ?? { text: "", align: "left" as Align });

  const header = pad(rows[0]);
  const body = rows.slice(1).map(pad);
  const aligns = header.map((cell, index) => {
    if (cell.align !== "left") return cell.align;
    const column = body.map((row) => row[index]);
    const explicit = column.find((item) => item.align !== "left");
    return explicit?.align ?? "left";
  });

  const separatorFor = (align: Align) => {
    if (align === "center") return ":---:";
    if (align === "right") return "---:";
    return "---";
  };

  const formatRow = (cells: string[]) => `| ${cells.join(" | ")} |`;

  return [
    formatRow(header.map((cell) => cell.text)),
    formatRow(aligns.map(separatorFor)),
    ...body.map((row) => formatRow(row.map((cell) => cell.text))),
  ].join("\n");
}