import Editor from "@monaco-editor/react";
import { editor, KeyCode, KeyMod, Range, Selection } from "monaco-editor";
import React, { useRef, useState, useEffect } from "react";
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

type EditorPosition = {
  lineNumber: number;
  column: number;
};

function positionAfterText(startLineNumber: number, startColumn: number, text: string): EditorPosition {
  const lines = text.split("\n");

  if (lines.length === 1) {
    return {
      lineNumber: startLineNumber,
      column: startColumn + text.length,
    };
  }

  return {
    lineNumber: startLineNumber + lines.length - 1,
    column: lines[lines.length - 1].length + 1,
  };
}

function selectAllInEditor(ed: editor.IStandaloneCodeEditor) {
  const model = ed.getModel();
  if (!model) return;

  const lastLine = Math.max(1, model.getLineCount());
  const lastColumn = model.getLineMaxColumn(lastLine);
  const selection = new Selection(1, 1, lastLine, lastColumn);

  ed.focus();
  ed.setSelection(selection);
  ed.revealRangeInCenterIfOutsideViewport(selection);
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
  const editorRef = useRef<editor.IStandaloneCodeEditor>();
  const isComposingRef = useRef(false);
  const [preview, setPreview] = useState<"edit" | "preview" | "comparison">("edit");
  const [uploading, setUploading] = useState(false);
  const { showAlert, AlertUI } = useAlert();

  async function insertImage(
    file: File,
    range: NonNullable<ReturnType<editor.IStandaloneCodeEditor["getSelection"]>>,
    showAlert: (msg: string) => void,
  ) {
    try {
      const result = await uploadImageFile(file);
      const editorInstance = editorRef.current;
      if (!editorInstance) return;
      editorInstance.executeEdits(undefined, [
        {
          range,
          text: buildMarkdownImage(file.name, result.url, {
            blurhash: result.blurhash,
            width: result.width,
            height: result.height,
          }),
        },
      ]);
    } catch (error) {
      console.error(error);
      showAlert(error instanceof Error ? error.message : t("upload.failed"));
    }
  }

  const getEditorAndSelection = () => {
    const editorInstance = editorRef.current;
    const model = editorInstance?.getModel();
    const selection = editorInstance?.getSelection();

    if (!editorInstance || !model || !selection) {
      return null;
    }

    return { editorInstance, model, selection };
  };

  const replaceSelection = (selection: Selection, text: string, nextSelection?: Selection) => {
    const editorInstance = editorRef.current;
    if (!editorInstance) return;

    editorInstance.executeEdits("markdown-toolbar", [
      {
        range: selection,
        text,
        forceMoveMarkers: true,
      },
    ]);
    setContent(editorInstance.getValue());

    if (nextSelection) {
      editorInstance.setSelection(nextSelection);
    } else {
      const position = positionAfterText(selection.startLineNumber, selection.startColumn, text);
      editorInstance.setPosition(position);
    }

    editorInstance.focus();
  };

  const wrapSelection = (prefix: string, suffix: string, fallback: string) => {
    const editorState = getEditorAndSelection();
    if (!editorState) return;

    const { model, selection } = editorState;
    const selectedText = model.getValueInRange(selection);
    const innerText = selectedText || fallback;
    const insertedText = `${prefix}${innerText}${suffix}`;
    const innerStart = positionAfterText(selection.startLineNumber, selection.startColumn, prefix);
    const innerEnd = positionAfterText(innerStart.lineNumber, innerStart.column, innerText);
    const end = positionAfterText(selection.startLineNumber, selection.startColumn, insertedText);
    const nextSelection = selectedText
      ? new Selection(end.lineNumber, end.column, end.lineNumber, end.column)
      : new Selection(innerStart.lineNumber, innerStart.column, innerEnd.lineNumber, innerEnd.column);

    replaceSelection(selection, insertedText, nextSelection);
  };

  const insertLink = () => {
    const editorState = getEditorAndSelection();
    if (!editorState) return;

    const { model, selection } = editorState;
    const selectedText = model.getValueInRange(selection);
    const label = selectedText || t("markdown_editor.placeholder.link_text");
    const url = t("markdown_editor.placeholder.link_url");
    const prefix = `[${label}](`;
    const insertedText = `${prefix}${url})`;
    const urlStart = positionAfterText(selection.startLineNumber, selection.startColumn, prefix);
    const urlEnd = positionAfterText(urlStart.lineNumber, urlStart.column, url);

    replaceSelection(
      selection,
      insertedText,
      new Selection(urlStart.lineNumber, urlStart.column, urlEnd.lineNumber, urlEnd.column),
    );
  };

  const insertMarkdownImage = () => {
    const editorState = getEditorAndSelection();
    if (!editorState) return;

    const { model, selection } = editorState;
    const selectedText = model.getValueInRange(selection);
    const alt = selectedText || t("markdown_editor.placeholder.image_alt");
    const url = t("markdown_editor.placeholder.image_url");
    const prefix = `![${alt}](`;
    const insertedText = `${prefix}${url})`;
    const urlStart = positionAfterText(selection.startLineNumber, selection.startColumn, prefix);
    const urlEnd = positionAfterText(urlStart.lineNumber, urlStart.column, url);

    replaceSelection(
      selection,
      insertedText,
      new Selection(urlStart.lineNumber, urlStart.column, urlEnd.lineNumber, urlEnd.column),
    );
  };

  const insertCodeBlock = () => {
    const editorState = getEditorAndSelection();
    if (!editorState) return;

    const { model, selection } = editorState;
    const selectedText = model.getValueInRange(selection);
    const innerText = selectedText || t("markdown_editor.placeholder.code_block");
    const prefix = "```\n";
    const insertedText = `${prefix}${innerText}\n\`\`\``;
    const innerStart = positionAfterText(selection.startLineNumber, selection.startColumn, prefix);
    const innerEnd = positionAfterText(innerStart.lineNumber, innerStart.column, innerText);
    const end = positionAfterText(selection.startLineNumber, selection.startColumn, insertedText);
    const nextSelection = selectedText
      ? new Selection(end.lineNumber, end.column, end.lineNumber, end.column)
      : new Selection(innerStart.lineNumber, innerStart.column, innerEnd.lineNumber, innerEnd.column);

    replaceSelection(selection, insertedText, nextSelection);
  };

  const insertHorizontalRule = () => {
    const editorState = getEditorAndSelection();
    if (!editorState) return;

    replaceSelection(editorState.selection, "\n---\n");
  };

  const formatSelectedLines = (
    formatter: (line: string, index: number) => string,
    emptyLineFallback: string,
  ) => {
    const editorState = getEditorAndSelection();
    if (!editorState) return;

    const { editorInstance, model, selection } = editorState;
    const startLineNumber = selection.startLineNumber;
    const endLineNumber =
      selection.endLineNumber > selection.startLineNumber && selection.endColumn === 1
        ? selection.endLineNumber - 1
        : selection.endLineNumber;
    const currentLine = model.getLineContent(startLineNumber);
    const isEmptySingleLine = selection.isEmpty() && currentLine.trim().length === 0;
    const lines = isEmptySingleLine
      ? [emptyLineFallback]
      : Array.from({ length: endLineNumber - startLineNumber + 1 }, (_, index) => {
          const lineNumber = startLineNumber + index;
          return formatter(model.getLineContent(lineNumber), index);
        });
    const targetEndLine = isEmptySingleLine ? startLineNumber : endLineNumber;
    const range = new Range(startLineNumber, 1, targetEndLine, model.getLineMaxColumn(targetEndLine));
    const insertedText = lines.join("\n");
    const end = positionAfterText(startLineNumber, 1, insertedText);

    editorInstance.executeEdits("markdown-toolbar", [
      {
        range,
        text: insertedText,
        forceMoveMarkers: true,
      },
    ]);
    setContent(editorInstance.getValue());
    editorInstance.setPosition(end);
    editorInstance.focus();
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
    const editorState = getEditorAndSelection();
    if (!editorState) return;

    const { model, selection } = editorState;
    const fullText = model.getValue();
    const from = model.getOffsetAt({
      lineNumber: selection.startLineNumber,
      column: selection.startColumn,
    });
    const to = model.getOffsetAt({
      lineNumber: selection.endLineNumber,
      column: selection.endColumn,
    });

    const range = findMarkdownTableRange(fullText, from, to);
    if (!range) {
      showAlert(t("markdown_editor.table.not_found"));
      return;
    }

    const markdown = fullText.slice(range.start, range.end);
    const html = markdownTableToHtml(markdown);
    if (!html) {
      showAlert(t("markdown_editor.table.invalid"));
      return;
    }

    const start = model.getPositionAt(range.start);
    const end = model.getPositionAt(range.end);
    replaceSelection(
      new Selection(start.lineNumber, start.column, end.lineNumber, end.column),
      html,
    );
  };

  const clearTableFormat = () => {
    const editorState = getEditorAndSelection();
    if (!editorState) return;

    const { model, selection } = editorState;
    const fullText = model.getValue();
    const from = model.getOffsetAt({
      lineNumber: selection.startLineNumber,
      column: selection.startColumn,
    });
    const to = model.getOffsetAt({
      lineNumber: selection.endLineNumber,
      column: selection.endColumn,
    });

    const range = findHtmlTableRange(fullText, from, to);
    if (!range) {
      showAlert(t("markdown_editor.table.html_not_found"));
      return;
    }

    const html = fullText.slice(range.start, range.end);
    const markdown = htmlTableToMarkdown(html);
    if (!markdown) {
      showAlert(t("markdown_editor.table.html_invalid"));
      return;
    }

    const start = model.getPositionAt(range.start);
    const end = model.getPositionAt(range.end);
    replaceSelection(
      new Selection(start.lineNumber, start.column, end.lineNumber, end.column),
      markdown,
    );
  };

  const handleSelectAll = () => {
    const editorInstance = editorRef.current;
    if (!editorInstance) return;
    selectAllInEditor(editorInstance);
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
    { key: "clear-table-format", icon: "ri-format-clear", label: t("markdown_editor.toolbar.clear_table_format"), onClick: clearTableFormat },  ];

  const handlePaste = async (event: React.ClipboardEvent<HTMLDivElement>) => {
    const clipboardData = event.clipboardData;
    if (clipboardData.files.length === 1) {
      const editorInstance = editorRef.current;
      if (!editorInstance) return;
      editorInstance.trigger(undefined, "undo", undefined);
      setUploading(true);
      const myfile = clipboardData.files[0] as File;
      const selection = editorInstance.getSelection();
      if (!selection) {
        setUploading(false);
        return;
      }
      void insertImage(myfile, selection, showAlert).finally(() => {
        setUploading(false);
      });
    }
  };

  function UploadImageButton() {
    const uploadRef = useRef<HTMLInputElement>(null);
    const label = t("markdown_editor.toolbar.upload_image");

    const upChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = event.currentTarget.files;
      if (!files) return;

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (file.size > 5 * 1024000) {
          showAlert(t("upload.failed$size", { size: 5 }));
          uploadRef.current!.value = "";
        } else {
          const editorInstance = editorRef.current;
          if (!editorInstance) return;
          const selection = editorInstance.getSelection();
          if (!selection) return;
          setUploading(true);
          void insertImage(file, selection, showAlert).finally(() => {
            setUploading(false);
          });
        }
      }
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

  const handleEditorMount = (ed: editor.IStandaloneCodeEditor) => {
    editorRef.current = ed;

    ed.addAction({
      id: "rin.markdown.selectAll",
      label: t("markdown_editor.select_all"),
      keybindings: [KeyMod.CtrlCmd | KeyCode.KeyA],
      precondition: "editorTextFocus",
      keybindingContext: "!suggestWidgetVisible",
      contextMenuGroupId: "9_cutcopypaste",
      contextMenuOrder: 0,
      run: selectAllInEditor,
    });

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
    const editorInstance = editorRef.current;
    if (!editorInstance) return;

    const model = editorInstance.getModel();
    if (!model) return;

    const editorValue = model.getValue();
    if (editorValue !== content) {
      editorInstance.setValue(content);
    }
  }, [content]);

  return (
    <div className="flex flex-col gap-0 sm:gap-3">
      <FlatInset className="flex flex-wrap items-center gap-2 border-0 border-b border-black/10 rounded-none bg-transparent p-2 dark:border-white/10 sm:p-3">
        <div className="flex shrink-0 flex-wrap items-center gap-1">
          <FlatTabButton active={preview === "edit"} onClick={() => setPreview("edit")}>
            {t("edit")}
          </FlatTabButton>
          <FlatTabButton active={preview === "preview"} onClick={() => setPreview("preview")}>
            {t("preview")}
          </FlatTabButton>
          <FlatTabButton active={preview === "comparison"} onClick={() => setPreview("comparison")}>
            {t("comparison")}
          </FlatTabButton>
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
        <div className={"flex min-w-0 flex-col " + (preview === "preview" ? "hidden" : "")}>
          <div
            className={"relative min-h-0 overflow-hidden rounded-none border-0 bg-w"}
            onDrop={(e) => {
              e.preventDefault();
              const editorInstance = editorRef.current;
              if (!editorInstance) return;
              for (let i = 0; i < e.dataTransfer.files.length; i++) {
                const selection = editorInstance.getSelection();
                if (!selection) return;
                const file = e.dataTransfer.files[i];
                setUploading(true);
                void insertImage(file, selection, showAlert).finally(() => {
                  setUploading(false);
                });
              }
            }}
            onPaste={handlePaste}
          >
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
                accessibilitySupport: "off",
                unicodeHighlight: { ambiguousCharacters: false },
                renderWhitespace: "none",
                renderControlCharacters: false,
                smoothScrolling: false,
                dragAndDrop: true,
                pasteAs: { enabled: false },
                contextmenu: true,
              }}
            />
          </div>
        </div>
        <div
          className={
            "min-h-0 overflow-y-auto rounded-none border-0 bg-w px-4 py-4 border-t sm:border-none " +
            (preview === "edit" ? "hidden" : "")
          }
          style={{ height: height }}
        >
          <Markdown content={content ? content : placeholder} />
        </div>
      </div>
      <AlertUI />
    </div>
  );
}


//选中（或光标落在）Markdown 表后，工具栏按钮把整张表换成这套 HTML。列数、行数、表头都从原表读。
//选中（或光标落在）Markdown 表后，工具栏按钮把整张表换成这套 HTML。列数、行数、表头都从原表读。
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