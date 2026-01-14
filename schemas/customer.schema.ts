import { z } from "zod";

/**
 * Phone validation regex (international format)
 */
const phoneRegex =
  /^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,9}$/;

/**
 * Customer Form Data Schema
 */
export const customerFormSchema = z.object({
  first_name: z
    .string()
    .min(2, {
      message: "El nombre debe tener al menos 2 caracteres",
    })
    .max(50, {
      message: "El nombre no puede superar los 50 caracteres",
    })
    .trim(),
  last_name: z
    .string()
    .min(2, {
      message: "El apellido debe tener al menos 2 caracteres",
    })
    .max(50, {
      message: "El apellido no puede superar los 50 caracteres",
    })
    .trim(),
  email: z
    .string()
    .email({
      message: "Email inválido",
    })
    .max(100)
    .optional()
    .or(z.literal("")),
  phone: z
    .string()
    .regex(phoneRegex, {
      message: "Número de teléfono inválido",
    })
    .min(8, {
      message: "El teléfono debe tener al menos 8 dígitos",
    })
    .max(20, {
      message: "El teléfono no puede superar los 20 caracteres",
    }),
  phone_country_code: z
    .string()
    .regex(/^\+?\d{1,4}$/, {
      message: "Código de país inválido",
    })
    .optional()
    .default("+54"),
  whatsapp_number: z
    .string()
    .regex(phoneRegex, {
      message: "Número de WhatsApp inválido",
    })
    .optional()
    .or(z.literal("")),
  date_of_birth: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, {
      message: "Fecha de nacimiento inválida. Formato esperado: YYYY-MM-DD",
    })
    .optional()
    .refine(
      (date) => {
        if (!date) return true;
        const birthDate = new Date(date);
        const today = new Date();
        const age = today.getFullYear() - birthDate.getFullYear();
        return age >= 0 && age <= 120;
      },
      {
        message: "Fecha de nacimiento inválida",
      }
    )
    .or(z.literal("")),
  gender: z
    .enum(["male", "female", "other", "prefer_not_to_say"], {
      message: "Género inválido",
    })
    .optional()
    .or(z.literal("")),
  notes: z
    .string()
    .max(1000, {
      message: "Las notas no pueden superar los 1000 caracteres",
    })
    .optional(),
  tags: z
    .array(
      z.string().max(50, {
        message: "Cada etiqueta no puede superar los 50 caracteres",
      })
    )
    .max(10, {
      message: "No se pueden agregar más de 10 etiquetas",
    })
    .optional(),
  photo_url: z
    .string()
    .url({
      message: "URL de foto inválida",
    })
    .max(500)
    .optional()
    .or(z.literal("")),
  preferred_staff_id: z
    .string()
    .uuid({
      message: "ID de personal preferido inválido",
    })
    .nullable()
    .optional(),
  is_active: z.boolean().optional().default(true),
});

/**
 * Customer Update Schema (for partial updates)
 */
export const customerUpdateSchema = customerFormSchema.partial();

/**
 * Customer Search/Filter Schema
 */
export const customerFilterSchema = z.object({
  search: z.string().max(100).optional(),
  tags: z.array(z.string()).optional(),
  is_active: z.boolean().optional(),
  preferred_staff_id: z.string().uuid().optional(),
  has_upcoming_appointments: z.boolean().optional(),
});

/**
 * Customer Import Schema (for bulk import)
 */
export const customerImportSchema = z.object({
  first_name: z.string().min(2).max(50).trim(),
  last_name: z.string().min(2).max(50).trim(),
  phone: z.string().regex(phoneRegex),
  email: z.string().email().optional().or(z.literal("")),
  whatsapp_number: z.string().regex(phoneRegex).optional().or(z.literal("")),
  notes: z.string().max(1000).optional(),
});

// Type inference
export type CustomerFormInput = z.infer<typeof customerFormSchema>;
export type CustomerUpdateInput = z.infer<typeof customerUpdateSchema>;
export type CustomerFilterInput = z.infer<typeof customerFilterSchema>;
export type CustomerImportInput = z.infer<typeof customerImportSchema>;
