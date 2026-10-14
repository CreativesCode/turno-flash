"use client";

import {
  addDays,
  addMonths,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  parseISO,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { es } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";

const WEEKDAYS = ["L", "M", "X", "J", "V", "S", "D"];

/**
 * Month grid for dates beyond the day strip of /book. Only `available` days
 * (YYYY-MM-DD, in order) can be picked; the rest show greyed out.
 */
export function MonthPicker({
  available,
  value,
  onSelect,
}: {
  available: string[];
  value: string | null;
  onSelect: (date: string) => void;
}) {
  const allowed = new Set(available);
  const first = startOfMonth(parseISO(available[0]));
  const last = startOfMonth(parseISO(available[available.length - 1]));
  const [month, setMonth] = useState(() =>
    value && allowed.has(value) ? startOfMonth(parseISO(value)) : first
  );

  const cells: Date[] = [];
  const end = endOfWeek(endOfMonth(month), { weekStartsOn: 1 });
  for (let d = startOfWeek(month, { weekStartsOn: 1 }); d <= end; d = addDays(d, 1)) {
    cells.push(d);
  }

  const navButton =
    "flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg text-foreground-muted transition-colors hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-30";

  return (
    <div className="rounded-xl border border-border bg-surface p-3">
      <div className="mb-2 flex items-center justify-between">
        <button
          type="button"
          className={navButton}
          onClick={() => setMonth(addMonths(month, -1))}
          disabled={month <= first}
          aria-label="Mes anterior"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="text-sm font-semibold capitalize text-foreground">
          {format(month, "MMMM yyyy", { locale: es })}
        </span>
        <button
          type="button"
          className={navButton}
          onClick={() => setMonth(addMonths(month, 1))}
          disabled={month >= last}
          aria-label="Mes siguiente"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center">
        {WEEKDAYS.map((w) => (
          <span key={w} className="py-1 text-caption font-semibold text-foreground-subtle">
            {w}
          </span>
        ))}
        {cells.map((d) => {
          const iso = format(d, "yyyy-MM-dd");
          if (!isSameMonth(d, month)) return <span key={iso} />;
          const enabled = allowed.has(iso);
          const selected = iso === value;
          return (
            <button
              key={iso}
              type="button"
              disabled={!enabled}
              onClick={() => onSelect(iso)}
              aria-pressed={selected}
              aria-label={format(d, "EEEE d 'de' MMMM", { locale: es })}
              className={`h-10 rounded-lg text-sm font-semibold transition-colors ${
                selected
                  ? "cursor-pointer bg-primary text-primary-foreground"
                  : enabled
                    ? "cursor-pointer text-foreground hover:bg-primary-50 dark:hover:bg-primary-900"
                    : "cursor-not-allowed text-foreground-subtle opacity-40"
              }`}
            >
              {format(d, "d")}
            </button>
          );
        })}
      </div>
    </div>
  );
}
