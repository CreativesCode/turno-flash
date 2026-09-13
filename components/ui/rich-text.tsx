"use client";

import { parseRichText, type RichNode } from "@/utils/whatsapp-format";
import { Fragment, type ReactNode } from "react";

export interface RichTextProps {
  /** Raw text with WhatsApp marks: *bold* _italic_ ~strike~ ```mono``` */
  text: string | null | undefined;
  className?: string;
}

function render(nodes: RichNode[], keyPrefix = ""): ReactNode[] {
  return nodes.map((node, index) => {
    const key = `${keyPrefix}${index}`;
    if (node.type === "text") {
      return <Fragment key={key}>{node.value}</Fragment>;
    }
    const children = render(node.children, `${key}-`);
    switch (node.type) {
      case "bold":
        return <strong key={key}>{children}</strong>;
      case "italic":
        return <em key={key}>{children}</em>;
      case "strike":
        return <s key={key}>{children}</s>;
      case "mono":
        return (
          <code
            key={key}
            className="rounded bg-surface-2 px-1 py-0.5 font-mono text-[0.9em]"
          >
            {children}
          </code>
        );
    }
  });
}

/**
 * Renders WhatsApp-style text as real elements, keeping line breaks.
 * What the business writes here is the same string that gets pasted into a
 * chat, so the formatting survives the trip.
 */
export function RichText({ text, className = "" }: RichTextProps) {
  if (!text) return null;
  return (
    <span className={`whitespace-pre-line ${className}`}>
      {render(parseRichText(text))}
    </span>
  );
}
