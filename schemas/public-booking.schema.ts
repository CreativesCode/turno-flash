import { nationalDigits } from "@/utils/phone";
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
      const national = nationalDigits(d.phone, d.country_code);
      const digits = d.country_code.replace(/\D/g, "").length + national.length;
      return digits >= 8 && digits <= 15;
    },
    { message: "El teléfono no parece completo", path: ["phone"] }
  )
  // WhatsApp needs a mobile: in Cuba 8 digits starting with 5
  .refine(
    (d) => d.country_code !== "+53" || /^5\d{7}$/.test(nationalDigits(d.phone, d.country_code)),
    {
      message: "Escribe tu móvil cubano: 8 dígitos que empiezan por 5",
      path: ["phone"],
    }
  )
  // Typing the country code again ("53 5..." with +53 picked) or a leading 0
  // no longer produces a wrong number
  .transform((d) => ({ ...d, phone: nationalDigits(d.phone, d.country_code) }));

export type PublicCustomerInput = z.infer<typeof publicCustomerSchema>;
