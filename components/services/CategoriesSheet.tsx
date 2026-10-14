"use client";

import {
  Button,
  Field,
  Sheet,
  sheetInputClasses as inputClasses,
} from "@/components/ui";
import {
  useCreateServiceCategory,
  useDeleteServiceCategory,
  useReorderServiceCategories,
  useToast,
  useUpdateServiceCategory,
} from "@/hooks";
import type { ServiceCategory } from "@/types/appointments";
import { ArrowDown, ArrowUp, Link2, Pencil, Trash2 } from "lucide-react";
import { FormEvent, useState } from "react";

export interface CategoriesSheetProps {
  open: boolean;
  onClose: () => void;
  categories: ServiceCategory[];
  /** Services per category id, to warn before deleting */
  serviceCounts: Map<string, number>;
  /** Public booking link of the business; null while it loads */
  bookingLink: string | null;
}

const EMPTY = { name: "", description: "" };
const iconButton =
  "flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-control text-foreground-subtle transition-colors hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-30";

/** Create, rename, describe, order and delete the categories of services. */
export function CategoriesSheet({
  open,
  onClose,
  categories,
  serviceCounts,
  bookingLink,
}: CategoriesSheetProps) {
  const toast = useToast();
  const createMutation = useCreateServiceCategory();
  const updateMutation = useUpdateServiceCategory();
  const deleteMutation = useDeleteServiceCategory();
  const reorderMutation = useReorderServiceCategories();

  const [form, setForm] = useState(EMPTY);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const saving = createMutation.isPending || updateMutation.isPending;

  const resetForm = () => {
    setForm(EMPTY);
    setEditingId(null);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (saving) return;
    try {
      if (editingId) {
        await updateMutation.mutateAsync({ id: editingId, input: form });
        toast.success("Categoría guardada");
      } else {
        await createMutation.mutateAsync(form);
        toast.success("Categoría creada", `Ya puedes elegir «${form.name.trim()}» en tus servicios`);
      }
      resetForm();
    } catch (err) {
      toast.error("No se pudo guardar", err instanceof Error ? err.message : undefined);
    }
  };

  const startEdit = (category: ServiceCategory) => {
    setConfirmDeleteId(null);
    setEditingId(category.id);
    setForm({ name: category.name, description: category.description ?? "" });
  };

  const handleDelete = async (category: ServiceCategory) => {
    try {
      await deleteMutation.mutateAsync(category.id);
      if (editingId === category.id) resetForm();
      setConfirmDeleteId(null);
      toast.success("Categoría borrada");
    } catch (err) {
      toast.error("No se pudo borrar", err instanceof Error ? err.message : undefined);
    }
  };

  const move = (index: number, delta: -1 | 1) => {
    const ids = categories.map((c) => c.id);
    [ids[index], ids[index + delta]] = [ids[index + delta], ids[index]];
    reorderMutation.mutate(ids, {
      onError: (err) => toast.error("No se pudo ordenar", err.message),
    });
  };

  const copyLink = async (category: ServiceCategory) => {
    if (!bookingLink) return;
    const link = `${bookingLink}&c=${category.id}`;
    try {
      await navigator.clipboard.writeText(link);
      toast.success("Link copiado", `Abre la reserva directo en «${category.name}»`);
    } catch {
      toast.error("No se pudo copiar", link);
    }
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Categorías"
      subtitle="Agrupan tus servicios aquí y en tu página de reservas"
    >
      <div className="flex flex-col gap-5">
        {categories.length > 0 && (
          <ul className="flex flex-col divide-y divide-border rounded-card border border-border">
            {categories.map((category, index) => {
              const count = serviceCounts.get(category.id) ?? 0;
              if (confirmDeleteId === category.id) {
                return (
                  <li key={category.id} className="flex flex-col gap-3 p-3">
                    <p className="text-body text-foreground">
                      ¿Borrar «{category.name}»?{" "}
                      <span className="text-foreground-muted">
                        {count === 0
                          ? "No tiene servicios."
                          : count === 1
                            ? "Su servicio quedará sin categoría; no se borra."
                            : `Sus ${count} servicios quedarán sin categoría; no se borran.`}
                      </span>
                    </p>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => setConfirmDeleteId(null)}
                        disabled={deleteMutation.isPending}
                        className="flex-1 justify-center"
                      >
                        Cancelar
                      </Button>
                      <Button
                        type="button"
                        variant="danger-solid"
                        size="sm"
                        onClick={() => handleDelete(category)}
                        disabled={deleteMutation.isPending}
                        className="flex-1 justify-center"
                      >
                        {deleteMutation.isPending ? "Borrando…" : "Borrar"}
                      </Button>
                    </div>
                  </li>
                );
              }
              return (
                <li key={category.id} className="flex items-center gap-1 py-2 pl-3 pr-1.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-body font-semibold text-foreground">
                      {category.name}
                    </p>
                    <p className="truncate text-meta text-foreground-muted">
                      {count === 1 ? "1 servicio" : `${count} servicios`}
                      {category.description ? ` · ${category.description}` : ""}
                    </p>
                  </div>
                  <button
                    type="button"
                    className={iconButton}
                    onClick={() => move(index, -1)}
                    disabled={index === 0}
                    aria-label={`Subir ${category.name}`}
                  >
                    <ArrowUp className="size-4" />
                  </button>
                  <button
                    type="button"
                    className={iconButton}
                    onClick={() => move(index, 1)}
                    disabled={index === categories.length - 1}
                    aria-label={`Bajar ${category.name}`}
                  >
                    <ArrowDown className="size-4" />
                  </button>
                  <button
                    type="button"
                    className={iconButton}
                    onClick={() => copyLink(category)}
                    disabled={!bookingLink}
                    aria-label={`Copiar link de reserva de ${category.name}`}
                  >
                    <Link2 className="size-4" />
                  </button>
                  <button
                    type="button"
                    className={iconButton}
                    onClick={() => startEdit(category)}
                    aria-label={`Editar ${category.name}`}
                  >
                    <Pencil className="size-4" />
                  </button>
                  <button
                    type="button"
                    className={iconButton}
                    onClick={() => setConfirmDeleteId(category.id)}
                    aria-label={`Borrar ${category.name}`}
                  >
                    <Trash2 className="size-4" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <p className="text-meta font-semibold text-foreground">
            {editingId ? "Editar categoría" : "Nueva categoría"}
          </p>
          <Field label="Nombre">
            <input
              type="text"
              required
              minLength={2}
              maxLength={50}
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className={inputClasses}
              placeholder="Ej: Bodas, Cortes, Consultas"
            />
          </Field>
          <Field
            label="Descripción (opcional)"
            hint="Se ve en tu página de reservas, debajo del nombre"
          >
            <input
              type="text"
              maxLength={200}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              className={inputClasses}
              placeholder="Ej: Incluye estilismo y vestuario"
            />
          </Field>
          <div className="flex gap-2">
            {editingId && (
              <Button
                type="button"
                variant="secondary"
                onClick={resetForm}
                disabled={saving}
                className="flex-1 justify-center"
              >
                Cancelar
              </Button>
            )}
            <Button
              type="submit"
              variant={editingId ? "primary" : "secondary"}
              disabled={saving}
              className="flex-2 justify-center"
            >
              {saving ? "Guardando…" : editingId ? "Guardar cambios" : "Agregar categoría"}
            </Button>
          </div>
        </form>
      </div>
    </Sheet>
  );
}
