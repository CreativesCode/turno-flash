import { z } from "zod";

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida");

/** Full days off (inclusive range) for a staff member or the whole business. */
export const staffExceptionSchema = z
  .object({
    from: isoDate,
    to: isoDate,
    title: z.string().trim().max(80).optional(),
  })
  .refine((d) => d.to >= d.from, {
    message: "La fecha final no puede ser anterior a la inicial",
  });

export type StaffExceptionInput = z.infer<typeof staffExceptionSchema>;
