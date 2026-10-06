import { nationalDigits } from "@/utils/phone";
// zod/mini, not "zod": this is the only schema of the public pages, and the
// full build of zod weighed ~50 KB compressed there (P2-02)
import {
  email,
  type infer as Infer,
  literal,
  maxLength,
  minLength,
  object,
  optional,
  pipe,
  refine,
  regex,
  string,
  transform,
  trim,
  union,
} from "zod/mini";

const name = (message: string) =>
  string().check(trim(), minLength(1, message), maxLength(80));

const customerFields = object({
  first_name: name("Ingresa tu nombre"),
  last_name: name("Ingresa tu apellido"),
  country_code: string().check(regex(/^\+\d{1,4}$/, "Código de país inválido")),
  phone: string().check(
    trim(),
    regex(/^[\d\s-]{6,20}$/, "Ingresa un teléfono válido"),
  ),
  email: optional(union([literal(""), email("Email inválido")])),
  notes: optional(
    string().check(trim(), maxLength(500, "Máximo 500 caracteres")),
  ),
}).check(
  refine(
    (d) => {
      const national = nationalDigits(d.phone, d.country_code);
      const digits = d.country_code.replace(/\D/g, "").length + national.length;
      return digits >= 8 && digits <= 15;
    },
    { message: "El teléfono no parece completo", path: ["phone"] },
  ),
  // WhatsApp needs a mobile: in Cuba 8 digits starting with 5
  refine(
    (d) =>
      d.country_code !== "+53" ||
      /^5\d{7}$/.test(nationalDigits(d.phone, d.country_code)),
    {
      message: "Escribe tu móvil cubano: 8 dígitos que empiezan por 5",
      path: ["phone"],
    },
  ),
);

/** Customer data of the public booking form (the edge function re-validates). */
export const publicCustomerSchema = pipe(
  customerFields,
  // Typing the country code again ("53 5..." with +53 picked) or a leading 0
  // no longer produces a wrong number
  transform((d) => ({ ...d, phone: nationalDigits(d.phone, d.country_code) })),
);

export type PublicCustomerInput = Infer<typeof publicCustomerSchema>;
