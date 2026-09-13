"use client";

import { sheetInputClasses } from "./sheet";
import { RichText } from "./rich-text";
import { toggleMark, type RichMark } from "@/utils/whatsapp-format";
import { Bold, Code, Eye, Italic, Strikethrough } from "lucide-react";
import { useRef, useState } from "react";

export interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  rows?: number;
  placeholder?: string;
  /** Accessible name for the text area. */
  label: string;
}

const TOOLS: { mark: RichMark; label: string; Icon: typeof Bold }[] = [
  { mark: "bold", label: "Negrita", Icon: Bold },
  { mark: "italic", label: "Cursiva", Icon: Italic },
  { mark: "strike", label: "Tachado", Icon: Strikethrough },
  { mark: "mono", label: "Monoespaciado", Icon: Code },
];

/**
 * Plain textarea with WhatsApp's own marks (*bold*, _italic_, ~strike~,
 * ```mono```) plus a toolbar that inserts them and a preview that shows how it
 * will read. No rich-text library: the stored value is the exact string the
 * business can paste into a chat.
 */
export function RichTextEditor({
  value,
  onChange,
  rows = 5,
  placeholder,
  label,
}: RichTextEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [showPreview, setShowPreview] = useState(false);

  const applyMark = (mark: RichMark) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const result = toggleMark(
      value,
      textarea.selectionStart,
      textarea.selectionEnd,
      mark
    );
    onChange(result.text);
    // Put the caret back where the writer expects it.
    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(result.selectionStart, result.selectionEnd);
    });
  };

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex flex-wrap items-center gap-1">
        {TOOLS.map(({ mark, label: toolLabel, Icon }) => (
          <button
            key={mark}
            type="button"
            onClick={() => applyMark(mark)}
            title={toolLabel}
            aria-label={toolLabel}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-surface text-foreground-muted transition-colors hover:bg-muted hover:text-foreground"
          >
            <Icon className="h-3.5 w-3.5" />
          </button>
        ))}
        <button
          type="button"
          onClick={() => setShowPreview((prev) => !prev)}
          className={`ml-auto inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold transition-colors ${
            showPreview
              ? "border-primary-500 bg-primary-500/10 text-primary-700 dark:text-primary-400"
              : "border-border bg-surface text-foreground-muted hover:bg-muted hover:text-foreground"
          }`}
        >
          <Eye className="h-3.5 w-3.5" />
          {showPreview ? "Editando" : "Vista previa"}
        </button>
      </div>

      {showPreview ? (
        <div
          className={`${sheetInputClasses} min-h-[6rem] cursor-text`}
          onClick={() => setShowPreview(false)}
        >
          {value ? (
            <RichText text={value} className="text-sm" />
          ) : (
            <span className="text-foreground-subtle">Nada escrito todavía…</span>
          )}
        </div>
      ) : (
        <textarea
          ref={textareaRef}
          rows={rows}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={sheetInputClasses}
          placeholder={placeholder}
          aria-label={label}
        />
      )}

      <p className="text-[11px] text-foreground-subtle">
        Se escribe como en WhatsApp: *negrita*, _cursiva_, ~tachado~. Lo que
        escribas acá se pega igual en un chat.
      </p>
    </div>
  );
}
