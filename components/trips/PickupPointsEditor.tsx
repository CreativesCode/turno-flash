"use client";

import { Field, sheetInputClasses as inputClasses } from "@/components/ui";
import type { NumericField, PickupPointFormState } from "@/types/trips";
import { MapPin, Plus, Trash2 } from "lucide-react";

export interface PickupPointsEditorProps {
  points: PickupPointFormState[];
  onChange: (points: PickupPointFormState[]) => void;
  /** Used when there are no stops: the trip's own price. */
  fallbackPrice: NumericField;
  fallbackDeposit: NumericField;
  /** Shows the return price column only when the trip is sold both ways. */
  roundTrip: boolean;
}

function parseNumeric(value: string): NumericField {
  if (value === "") return "";
  const parsed = Number(value);
  return Number.isNaN(parsed) ? "" : parsed;
}

export const emptyPickupPoint = (
  price: NumericField,
  deposit: NumericField
): PickupPointFormState => ({
  id: "",
  name: "",
  details: "",
  pickup_time: "",
  price_per_seat: price,
  price_round_trip: "",
  deposit_per_seat: deposit,
});

/**
 * Stops of the departure. Each one carries its own price and deposit because
 * the same trip is sold at different prices depending on where the passenger
 * boards (a passenger from the terminal pays a different deposit than one
 * picked up in another town).
 *
 * With no stops loaded, the trip's own price applies and the public page just
 * asks for seats.
 */
export function PickupPointsEditor({
  points,
  onChange,
  fallbackPrice,
  fallbackDeposit,
  roundTrip,
}: PickupPointsEditorProps) {
  const patch = (index: number, changes: Partial<PickupPointFormState>) => {
    const next = [...points];
    next[index] = { ...next[index], ...changes };
    onChange(next);
  };

  const remove = (index: number) => {
    onChange(points.filter((_, i) => i !== index));
  };

  return (
    <Field
      label="Puntos de recogida"
      hint="Cada punto puede tener su propio precio y su propia seña. Sin puntos, se usa el precio de la salida."
    >
      <div className="flex flex-col gap-3">
        {points.length === 0 && (
          <p className="rounded-lg border border-dashed border-border-2 p-3 text-xs text-foreground-muted">
            Sin puntos cargados: todos pagan el precio de la salida y el cliente
            no elige dónde lo recogen.
          </p>
        )}

        {points.map((point, index) => (
          <div
            key={point.id || `new-${index}`}
            className="rounded-lg border border-border bg-surface p-3 shadow-xs"
          >
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 shrink-0 text-foreground-muted" />
              <input
                type="text"
                value={point.name}
                onChange={(e) => patch(index, { name: e.target.value })}
                className={inputClasses}
                placeholder="Santa Clara — Terminal Nueva"
              />
              <button
                type="button"
                onClick={() => remove(index)}
                aria-label="Quitar punto"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-foreground-muted transition-colors hover:bg-danger-50 hover:text-danger-600"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>

            <div
              className={`mt-2 grid gap-2 ${
                roundTrip ? "sm:grid-cols-4" : "sm:grid-cols-3"
              }`}
            >
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-[0.05em] text-foreground-muted">
                  Hora
                </label>
                <input
                  type="time"
                  value={point.pickup_time}
                  onChange={(e) => patch(index, { pickup_time: e.target.value })}
                  className={`${inputClasses} mt-1`}
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-[0.05em] text-foreground-muted">
                  {roundTrip ? "Solo ida" : "Precio"}
                </label>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={point.price_per_seat}
                  onChange={(e) =>
                    patch(index, { price_per_seat: parseNumeric(e.target.value) })
                  }
                  className={`${inputClasses} mt-1`}
                />
              </div>
              {roundTrip && (
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-[0.05em] text-foreground-muted">
                    Ida y vuelta
                  </label>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={point.price_round_trip}
                    onChange={(e) =>
                      patch(index, {
                        price_round_trip: parseNumeric(e.target.value),
                      })
                    }
                    className={`${inputClasses} mt-1`}
                    placeholder="El de la salida"
                  />
                </div>
              )}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-[0.05em] text-foreground-muted">
                  Seña
                </label>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={point.deposit_per_seat}
                  onChange={(e) =>
                    patch(index, {
                      deposit_per_seat: parseNumeric(e.target.value),
                    })
                  }
                  className={`${inputClasses} mt-1`}
                />
              </div>
            </div>

            <input
              type="text"
              value={point.details}
              onChange={(e) => patch(index, { details: e.target.value })}
              className={`${inputClasses} mt-2`}
              placeholder="Indicación: frente a la lista de espera…"
            />
          </div>
        ))}

        <button
          type="button"
          onClick={() =>
            onChange([
              ...points,
              emptyPickupPoint(fallbackPrice, fallbackDeposit),
            ])
          }
          className="inline-flex w-fit items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-foreground transition-colors hover:bg-muted"
        >
          <Plus className="h-3.5 w-3.5" />
          Agregar punto de recogida
        </button>
      </div>
    </Field>
  );
}
