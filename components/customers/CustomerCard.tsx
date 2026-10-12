"use client";

import { Avatar, Badge, KebabMenu, ListRow } from "@/components/ui";
import type { Customer } from "@/types/appointments";

export interface CustomerCardProps {
  customer: Customer;
  onEdit: (c: Customer) => void;
  onDelete: (c: Customer) => void;
  /** Inactive customers get "Reactivar" instead of "Desactivar" (P2-14). */
  onReactivate?: (c: Customer) => void;
}

/** One customer as a list row: tapping it opens the edit form. */
export function CustomerCard({
  customer,
  onEdit,
  onDelete,
  onReactivate,
}: CustomerCardProps) {
  const fullName =
    `${customer.first_name} ${customer.last_name}`.trim() || "Sin nombre";

  return (
    <ListRow
      leading={<Avatar name={fullName} seed={customer.id} size={40} />}
      title={fullName}
      titleAside={
        !customer.is_active && <Badge variant="muted">Inactivo</Badge>
      }
      subtitle={
        <span className="font-mono tabular-nums">{customer.phone || "—"}</span>
      }
      trailing={
        <KebabMenu
          items={[
            { label: "Editar", onClick: () => onEdit(customer) },
            customer.is_active || !onReactivate
              ? {
                  label: "Desactivar",
                  danger: true,
                  onClick: () => onDelete(customer),
                }
              : { label: "Reactivar", onClick: () => onReactivate(customer) },
          ]}
        />
      }
      onClick={() => onEdit(customer)}
    />
  );
}
