import { HelpManual, type HelpPanel } from "@/components/help/HelpManual";
import type { Metadata } from "next";
import { Bricolage_Grotesque } from "next/font/google";
import { readFileSync } from "node:fs";
import path from "node:path";

export const metadata: Metadata = {
  title: "Ayuda",
  description:
    "Manual de Turno Flash: qué pueden hacer el dueño y el personal en negocios de turnos y de venta de pasajes.",
};

const displayFont = Bricolage_Grotesque({
  subsets: ["latin"],
  weight: ["600", "800"],
});

/**
 * The manual has a single source: docs/user-manual/turno-flash-user-manual.html,
 * which is also a standalone page. It is read at build time (static export), so
 * the text lives in one place and the native app ships it offline.
 */
const SOURCE = path.join(
  process.cwd(),
  "docs",
  "user-manual",
  "turno-flash-user-manual.html"
);

function stripTags(html: string): string {
  return html.replace(/<[^>]+>/g, "").trim();
}

function loadManual(): { css: string; panels: HelpPanel[] } {
  const source = readFileSync(SOURCE, "utf8");
  const css = source.match(/<style>([\s\S]*?)<\/style>/)?.[1] ?? "";
  const panels = [
    ...source.matchAll(
      /<article class="panel" id="([\w-]+)"[^>]*>([\s\S]*?)<\/article>/g
    ),
  ].map(([, id, html]) => ({
    id,
    html,
    toc: [...html.matchAll(/<h2 id="([\w-]+)">([\s\S]*?)<\/h2>/g)].map(
      ([, anchor, label]) => ({ id: anchor, label: stripTags(label) })
    ),
  }));
  return { css, panels };
}

export default function HelpPage() {
  const { css, panels } = loadManual();
  return (
    <HelpManual
      css={css}
      panels={panels}
      displayFontFamily={displayFont.style.fontFamily}
    />
  );
}
