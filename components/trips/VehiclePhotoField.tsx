"use client";

import { TripService } from "@/services/trips.service";
import { useToast } from "@/hooks";
import { Camera, Loader2, Trash2 } from "lucide-react";
import { useRef, useState } from "react";

export interface VehiclePhotoFieldProps {
  /** Path inside the bucket, or "" when the departure has no photo yet. */
  value: string;
  organizationId: string;
  onChange: (path: string) => void;
  disabled?: boolean;
}

/**
 * Photo of the bus for one departure. Agencies send it the day before so the
 * passenger recognises the vehicle at the stop.
 *
 * It uploads as soon as the file is picked, before the departure is saved:
 * the form only carries the resulting path. A photo uploaded for a departure
 * that is never saved just sits in the bucket, which is cheaper than making
 * the operator save twice.
 */
export function VehiclePhotoField({
  value,
  organizationId,
  onChange,
  disabled,
}: VehiclePhotoFieldProps) {
  const toast = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const url = TripService.vehiclePhotoUrl(value);

  const handlePick = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    const previous = value;
    const result = await TripService.uploadVehiclePhoto(file, organizationId);
    setBusy(false);
    if (!result.success || !result.path) {
      toast.error("Error", result.error ?? "No se pudo subir la foto");
      return;
    }
    onChange(result.path);
    // The replaced photo is nobody's now: leaving it would grow the bucket
    // one dead file per correction.
    void TripService.removeVehiclePhoto(previous || null);
  };

  const handleRemove = () => {
    const previous = value;
    onChange("");
    void TripService.removeVehiclePhoto(previous || null);
  };

  return (
    <div>
      <label className="block text-[10px] font-bold uppercase tracking-[0.05em] text-foreground-muted">
        Foto del vehículo
      </label>

      <div className="mt-1.5 flex items-center gap-3">
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element -- Storage URL, no loader configured
          <img
            src={url}
            alt="Foto del vehículo"
            className="h-16 w-24 shrink-0 rounded-lg border border-border object-cover"
          />
        ) : (
          <div className="flex h-16 w-24 shrink-0 items-center justify-center rounded-lg border border-dashed border-border bg-surface-2 text-foreground-subtle">
            <Camera className="h-5 w-5" />
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={disabled || busy}
            onClick={() => inputRef.current?.click()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-foreground shadow-xs transition-colors hover:bg-surface-2 disabled:opacity-60"
          >
            {busy ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Camera className="h-3.5 w-3.5" />
            )}
            {busy ? "Subiendo…" : url ? "Cambiar foto" : "Subir foto"}
          </button>

          {url && !busy && (
            <button
              type="button"
              disabled={disabled}
              onClick={handleRemove}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-danger-600 shadow-xs transition-colors hover:bg-surface-2 disabled:opacity-60"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Quitar
            </button>
          )}
        </div>
      </div>

      <p className="mt-1 text-[11px] text-foreground-subtle">
        La ve el cliente en tu página de reservas. Se achica sola antes de
        subirse.
      </p>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          void handlePick(e.target.files?.[0]);
          // Same file twice in a row has to fire onChange again.
          e.target.value = "";
        }}
      />
    </div>
  );
}
