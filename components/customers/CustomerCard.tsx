"use client";

import { Avatar, Card } from "@/components/ui";
import type { Customer } from "@/types/appointments";
import { Mail, MoreVertical, Phone } from "lucide-react";
import { useMemo, useRef, useState, useEffect } from "react";

const PALETTE = [
  "#db2777",
  "#22c55e",
  "#3b82f6",
  "#f59e0b",
  "#8b5cf6",
  "#06b6d4",
  "#ef4444",
];

function pickColor(seed: string): string {
  if (!seed) return PALETTE[0];
  const last = seed.charCodeAt(seed.length - 1);
  return PALETTE[last % PALETTE.length];
}

export interface CustomerCardProps {
  customer: Customer;
  onEdit: (c: Customer) => void;
  onDelete: (c: Customer) => void;
}

export function CustomerCard({ customer, onEdit, onDelete }: CustomerCardProps) {
  const fullName =
    `${customer.first_name} ${customer.last_name}`.trim() || "Sin nombre";
  const color = useMemo(() => pickColor(customer.id), [customer.id]);
  const hasWhatsApp = !!customer.whatsapp_number;
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onDocClick = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [menuOpen]);

  return (
    <Card className="relative flex items-center gap-3 p-3">
      <Avatar name={fullName} color={color} size={42} />

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="truncate text-sm font-bold text-foreground">
            {fullName}
          </span>
          {hasWhatsApp && (
            <span className="inline-flex items-center gap-0.5 rounded-full border border-primary-600 bg-primary-50 px-2 py-0.5 text-[11px] font-bold text-primary-600 dark:border-primary-400 dark:bg-primary-900/20 dark:text-primary-300">
              WA
            </span>
          )}
          {!customer.is_active && (
            <span className="rounded-full border border-danger-600 bg-danger-50 px-2 py-0.5 text-[11px] font-bold text-danger-600 dark:border-danger-400 dark:bg-danger-900/20 dark:text-danger-300">
              Inactivo
            </span>
          )}
        </div>

        <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-xs text-foreground-muted">
          <span className="inline-flex items-center gap-1">
            <Phone className="h-3 w-3" />
            {customer.phone || "—"}
          </span>
          {customer.email && (
            <span className="inline-flex items-center gap-1 truncate">
              <Mail className="h-3 w-3 shrink-0" />
              <span className="truncate">{customer.email}</span>
            </span>
          )}
        </div>

        {customer.notes && (
          <div className="mt-1 truncate text-[11px] italic text-foreground-muted">
            &ldquo;{customer.notes}&rdquo;
          </div>
        )}
      </div>

      <div ref={menuRef} className="relative">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setMenuOpen((v) => !v);
          }}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-foreground-muted transition-colors hover:bg-muted hover:text-foreground"
          aria-label="Más acciones"
        >
          <MoreVertical className="h-4 w-4" />
        </button>
        {menuOpen && (
          <div className="absolute right-0 top-10 z-20 w-36 overflow-hidden rounded-lg border border-border bg-surface shadow-lg">
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                onEdit(customer);
              }}
              className="block w-full px-3 py-2 text-left text-sm text-foreground transition-colors hover:bg-muted"
            >
              Editar
            </button>
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                onDelete(customer);
              }}
              className="block w-full px-3 py-2 text-left text-sm text-danger-600 transition-colors hover:bg-danger-50 dark:hover:bg-danger-900/20"
            >
              {customer.is_active ? "Desactivar" : "Eliminar"}
            </button>
          </div>
        )}
      </div>
    </Card>
  );
}
