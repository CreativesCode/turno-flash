import { z } from "zod";

/** Customer data of the public booking form (the edge function re-validates). */
export const publicCustomerSchema = z
  .object({
    first_name: z.string().trim().min(1, "Ingresa tu nombre").max(80),
    last_name: z.string().trim().min(1, "Ingresa tu apellido").max(80),
    country_code: z.string().regex(/^\+\d{1,4}$/, "Código de país inválido"),
    phone: z
      .string()
      .trim()
      .regex(/^[\d\s-]{6,20}$/, "Ingresa un teléfono válido"),
    email: z.union([z.literal(""), z.email("Email inválido")]).optional(),
    notes: z.string().trim().max(500, "Máximo 500 caracteres").optional(),
  })
  .refine(
    (d) => {
      const digits = `${d.country_code}${d.phone}`.replace(/\D/g, "").length;
      return digits >= 8 && digits <= 15;
    },
    { message: "El teléfono no parece completo", path: ["phone"] }
  );

export type PublicCustomerInput = z.infer<typeof publicCustomerSchema>;
