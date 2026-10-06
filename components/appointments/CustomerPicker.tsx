"use client";

import { sheetInputClasses as inputClasses } from "@/components/ui";
import type { Customer } from "@/types/appointments";
import { Search, UserPlus, X } from "lucide-react";
import { useMemo, useState } from "react";

const MAX_RESULTS = 6;

interface CustomerPickerProps {
  customers: Customer[];
  value: string;
  onSelect: (customerId: string) => void;
  /** No match: open the quick-create form, prefilled with what was typed. */
  onCreateWith: (query: string) => void;
}

/**
 * Search-as-you-type customer picker for "Nuevo turno" (P1-11). Matches any
 * part of the name, or the phone by digits only, so "52 56" finds
 * "+5352564206".
 */
export function CustomerPicker({
  customers,
  value,
  onSelect,
  onCreateWith,
}: CustomerPickerProps) {
  const [query, setQuery] = useState("");
  const selected = customers.find((c) => c.id === value);

  const matches = useMemo(() => {
    const text = query.trim().toLowerCase();
    if (!text) return [];
    const digits = text.replace(/\D/g, "");
    return customers
      .filter((c) => {
        const name = `${c.first_name} ${c.last_name}`.toLowerCase();
        const phone = (c.phone ?? "").replace(/\D/g, "");
        return (
          name.includes(text) || (digits.length >= 3 && phone.includes(digits))
        );
      })
      .slice(0, MAX_RESULTS);
  }, [customers, query]);

  if (selected) {
    return (
      <div className="flex min-h-11 items-center justify-between gap-2 rounded-lg border border-primary-500 bg-primary-50 px-3 py-2 dark:bg-primary-900/20">
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-foreground">
            {selected.first_name} {selected.last_name}
          </div>
          <div className="truncate text-xs text-foreground-muted">
            {selected.phone}
          </div>
        </div>
        <button
          type="button"
          onClick={() => onSelect("")}
          aria-label="Cambiar cliente"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-foreground-muted hover:bg-muted"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground-subtle" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Busca por nombre o teléfono"
          className={`${inputClasses} pl-9`}
        />
      </div>

      {matches.length > 0 && (
        <ul className="mt-2 flex flex-col gap-1">
          {matches.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => {
                  onSelect(c.id);
                  setQuery("");
                }}
                className="flex min-h-11 w-full items-center justify-between gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-left hover:bg-muted"
              >
                <span className="truncate text-sm font-semibold text-foreground">
                  {c.first_name} {c.last_name}
                </span>
                <span className="shrink-0 text-xs text-foreground-muted">
                  {c.phone}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {query.trim() && matches.length === 0 && (
        <button
          type="button"
          onClick={() => onCreateWith(query.trim())}
          className="mt-2 flex min-h-11 w-full items-center gap-2 rounded-lg border border-dashed border-border px-3 py-2 text-sm font-semibold text-secondary-500 hover:bg-muted"
        >
          <UserPlus className="h-4 w-4" />
          Crear cliente nuevo con «{query.trim()}»
        </button>
      )}
    </div>
  );
}
