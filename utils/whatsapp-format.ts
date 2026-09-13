/**
 * WhatsApp-flavoured markup, the only formatting this project supports.
 *
 * The business types the same marks WhatsApp uses, so the text can be pasted
 * into a chat and look exactly like it looks in the app:
 *   *bold*  _italic_  ~strike~  ```mono```
 *
 * No HTML is produced here: the parser returns a tree that React renders as
 * real elements, so a description can never inject markup.
 */

export type RichNode =
  | { type: "text"; value: string }
  | { type: "bold" | "italic" | "strike" | "mono"; children: RichNode[] };

export type RichMark = "bold" | "italic" | "strike" | "mono";

/** The marker each style uses, in the order the parser tries them. */
export const MARKERS: Record<RichMark, string> = {
  mono: "```",
  bold: "*",
  italic: "_",
  strike: "~",
};

const ORDER: RichMark[] = ["mono", "bold", "italic", "strike"];

/**
 * A marker only opens a style when it is followed by content and closed later
 * on, the way WhatsApp behaves: "2 * 3 = 6" stays plain text.
 */
function findClosing(text: string, marker: string, from: number): number {
  let index = text.indexOf(marker, from);
  while (index !== -1) {
    // An empty span (** ) is not formatting.
    if (index > from) return index;
    index = text.indexOf(marker, index + marker.length);
  }
  return -1;
}

export function parseRichText(text: string): RichNode[] {
  const nodes: RichNode[] = [];
  let buffer = "";
  let i = 0;

  const flush = () => {
    if (buffer) {
      nodes.push({ type: "text", value: buffer });
      buffer = "";
    }
  };

  while (i < text.length) {
    let matched = false;

    for (const mark of ORDER) {
      const marker = MARKERS[mark];
      if (!text.startsWith(marker, i)) continue;

      const contentStart = i + marker.length;
      const closing = findClosing(text, marker, contentStart);
      if (closing === -1) continue;

      flush();
      nodes.push({
        type: mark,
        children:
          mark === "mono"
            ? [{ type: "text", value: text.slice(contentStart, closing) }]
            : parseRichText(text.slice(contentStart, closing)),
      });
      i = closing + marker.length;
      matched = true;
      break;
    }

    if (!matched) {
      buffer += text[i];
      i += 1;
    }
  }

  flush();
  return nodes;
}

/**
 * Wraps the selection with a marker, or unwraps it when it is already applied.
 * Returns the new text plus where the selection should end up.
 */
export function toggleMark(
  text: string,
  selectionStart: number,
  selectionEnd: number,
  mark: RichMark
): { text: string; selectionStart: number; selectionEnd: number } {
  const marker = MARKERS[mark];
  const selected = text.slice(selectionStart, selectionEnd);

  // Already wrapped: remove the markers instead of stacking more.
  const before = text.slice(selectionStart - marker.length, selectionStart);
  const after = text.slice(selectionEnd, selectionEnd + marker.length);
  if (before === marker && after === marker) {
    return {
      text:
        text.slice(0, selectionStart - marker.length) +
        selected +
        text.slice(selectionEnd + marker.length),
      selectionStart: selectionStart - marker.length,
      selectionEnd: selectionEnd - marker.length,
    };
  }

  if (selected.startsWith(marker) && selected.endsWith(marker) && selected.length > marker.length * 2) {
    const stripped = selected.slice(marker.length, selected.length - marker.length);
    return {
      text: text.slice(0, selectionStart) + stripped + text.slice(selectionEnd),
      selectionStart,
      selectionEnd: selectionStart + stripped.length,
    };
  }

  const wrapped = `${marker}${selected}${marker}`;
  return {
    text: text.slice(0, selectionStart) + wrapped + text.slice(selectionEnd),
    // With no selection the caret lands between the markers, ready to type.
    selectionStart: selectionStart + marker.length,
    selectionEnd: selectionEnd + marker.length,
  };
}
