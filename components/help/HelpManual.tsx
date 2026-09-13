"use client";

import { Logo } from "@/components/ui";
import { useAuth } from "@/contexts/auth-context";
import { useOrganizationModules } from "@/hooks/useOrganizationModules.query";
import { ArrowLeft, Bus, Calendar } from "lucide-react";
import Link from "next/link";
import { type CSSProperties, useEffect, useState, useSyncExternalStore } from "react";

export interface HelpPanel {
  /** "<module>-<role>", e.g. "viajes-personal". */
  id: string;
  html: string;
  toc: { id: string; label: string }[];
}

type HelpModule = "turnos" | "viajes";
type HelpRole = "dueno" | "personal";

interface HelpManualProps {
  css: string;
  panels: HelpPanel[];
  displayFontFamily: string;
}

/** Which panel holds this anchor, whether it is a panel id or a section id. */
function panelForAnchor(panels: HelpPanel[], anchor: string): HelpPanel | null {
  return (
    panels.find(
      (panel) =>
        panel.id === anchor || panel.toc.some((entry) => entry.id === anchor)
    ) ?? null
  );
}

function subscribeToHash(onChange: () => void) {
  window.addEventListener("hashchange", onChange);
  return () => window.removeEventListener("hashchange", onChange);
}

export function HelpManual({ css, panels, displayFontFamily }: HelpManualProps) {
  const { profile } = useAuth();
  const { modules } = useOrganizationModules();
  // What the reader picked with the switches; wins over everything else.
  const [chosen, setChosen] = useState<string | null>(null);
  const hash = useSyncExternalStore(
    subscribeToHash,
    () => window.location.hash.slice(1),
    () => ""
  );

  // Without a choice: a shared link (/help#viajes-personal, /help#vd-pasajeros),
  // then the guide that fits the signed-in user, then the first one.
  const linked = hash ? panelForAnchor(panels, hash) : null;
  const fromProfile = profile
    ? `${profile.organization_id && modules.trips && !modules.appointments ? "viajes" : "turnos"}-${
        profile.role === "staff" ? "personal" : "dueno"
      }`
    : null;
  const activeId = chosen ?? linked?.id ?? fromProfile ?? panels[0]?.id;
  const active = panels.find((panel) => panel.id === activeId) ?? panels[0];
  const [module, role] = active.id.split("-") as [HelpModule, HelpRole];

  // Arriving with a link to a section: bring it into view once.
  useEffect(() => {
    const anchor = window.location.hash.slice(1);
    const panel = anchor ? panelForAnchor(panels, anchor) : null;
    if (panel && anchor !== panel.id) {
      requestAnimationFrame(() => document.getElementById(anchor)?.scrollIntoView());
    }
  }, [panels]);

  // The manual styles key on data-theme; the app themes with the .dark class.
  useEffect(() => {
    const root = document.documentElement;
    const sync = () => {
      root.dataset.theme = root.classList.contains("dark") ? "dark" : "light";
    };
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(root, { attributes: true, attributeFilter: ["class"] });
    return () => {
      observer.disconnect();
      delete root.dataset.theme;
    };
  }, []);

  const choose = (nextModule: HelpModule, nextRole: HelpRole) => {
    setChosen(`${nextModule}-${nextRole}`);
    window.history.replaceState(null, "", `#${nextModule}-${nextRole}`);
    window.scrollTo({ top: 0 });
  };

  const fonts = {
    "--hm-font-display": displayFontFamily,
    "--hm-font-body": "var(--font-geist-sans), system-ui, sans-serif",
    "--hm-font-mono": "var(--font-geist-mono), ui-monospace, monospace",
    fontFamily: "var(--hm-font-body)",
  } as CSSProperties;

  return (
    <div style={fonts}>
      <style dangerouslySetInnerHTML={{ __html: css }} />

      <header className="topbar">
        <div className="topbar-inner">
          <div className="brand">
            <Logo size={30} priority />
            <div>
              <div className="brand-name">Ayuda de Turno Flash</div>
              <Link href={profile ? "/dashboard" : "/"} className="brand-back">
                <ArrowLeft aria-hidden style={{ display: "inline", width: 12, height: 12, verticalAlign: "-1px" }} />{" "}
                {profile ? "Volver al panel" : "Volver al inicio"}
              </Link>
            </div>
          </div>
          <div className="switches">
            <div className="seg" role="group" aria-label="Tipo de negocio">
              <button
                type="button"
                id="mod-turnos"
                aria-pressed={module === "turnos"}
                onClick={() => choose("turnos", role)}
              >
                <Calendar aria-hidden />
                Turnos
              </button>
              <button
                type="button"
                id="mod-viajes"
                aria-pressed={module === "viajes"}
                onClick={() => choose("viajes", role)}
              >
                <Bus aria-hidden />
                Viajes
              </button>
            </div>
            <div className="seg" role="group" aria-label="Rol">
              <button
                type="button"
                id="role-dueno"
                aria-pressed={role === "dueno"}
                onClick={() => choose(module, "dueno")}
              >
                Dueño
              </button>
              <button
                type="button"
                id="role-personal"
                aria-pressed={role === "personal"}
                onClick={() => choose(module, "personal")}
              >
                Personal
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="shell">
        <nav className="toc" aria-label="Contenido">
          <div className="toc-label">En esta guía</div>
          <ol>
            {active.toc.map((entry) => (
              <li key={entry.id}>
                <a href={`#${entry.id}`}>{entry.label}</a>
              </li>
            ))}
          </ol>
        </nav>

        <main>
          <details className="toc-mobile" key={active.id}>
            <summary>Contenido de esta guía</summary>
            <ol>
              {active.toc.map((entry) => (
                <li key={entry.id}>
                  <a href={`#${entry.id}`}>{entry.label}</a>
                </li>
              ))}
            </ol>
          </details>

          {panels.map((panel) => (
            <article
              key={panel.id}
              className="panel"
              id={panel.id}
              hidden={panel.id !== active.id}
              dangerouslySetInnerHTML={{ __html: panel.html }}
            />
          ))}

          <p className="foot">
            Manual basado en la versión de Turno Flash de septiembre de 2026. Los
            ejemplos de nombres, negocios y montos son ilustrativos.
          </p>
        </main>
      </div>
    </div>
  );
}
