import { z } from "zod";

/**
 * Service Form Data Schema
 */
export const serviceFormSchema = z.object({
  category_id: z
    .string()
    .uuid({
      message: "ID de categoría inválido",
    })
    .nullable()
    .optional(),
  name: z
    .string()
    .min(2, {
      message: "El nombre debe tener al menos 2 caracteres",
    })
    .max(100, {
      message: "El nombre no puede superar los 100 caracteres",
    })
    .trim(),
  description: z
    .string()
    .max(500, {
      message: "La descripción no puede superar los 500 caracteres",
    })
    .optional()
    .or(z.literal("")),
  duration_minutes: z
    .number()
    .int({
      message: "La duración debe ser un número entero",
    })
    .min(5, {
      message: "La duración mínima es 5 minutos",
    })
    .max(480, {
      message: "La duración máxima es 480 minutos (8 horas)",
    }),
  buffer_time_minutes: z
    .number()
    .int({
      message: "El tiempo de espera debe ser un número entero",
    })
    .min(0, {
      message: "El tiempo de espera no puede ser negativo",
    })
    .max(120, {
      message: "El tiempo de espera máximo es 120 minutos",
    })
    .optional()
    .default(0),
  price: z
    .number()
    .min(0, {
      message: "El precio no puede ser negativo",
    })
    .max(1000000, {
      message: "El precio no puede superar 1,000,000",
    })
    .nullable()
    .optional(),
  currency: z
    .string()
    .length(3, {
      message: "El código de moneda debe tener 3 caracteres (ej: ARS, USD)",
    })
    .optional()
    .default("ARS"),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, {
      message: "Color inválido. Use formato hexadecimal (ej: #FF5733)",
    })
    .optional()
    .default("#3B82F6"),
  is_active: z.boolean().optional().default(true),
  requires_approval: z.boolean().optional().default(false),
  max_advance_booking_days: z
    .number()
    .int()
    .min(1, {
      message: "Mínimo 1 día de anticipación",
    })
    .max(365, {
      message: "Máximo 365 días de anticipación",
    })
    .optional()
    .default(90),
  min_advance_booking_hours: z
    .number()
    .int()
    .min(0, {
      message: "Las horas de anticipación no pueden ser negativas",
    })
    .max(168, {
      message: "Máximo 168 horas (7 días) de anticipación mínima",
    })
    .optional()
    .default(1),
  available_for_online_booking: z.boolean().optional().default(true),
  image_url: z
    .string()
    .url({
      message: "URL de imagen inválida",
    })
    .max(500)
    .optional()
    .or(z.literal("")),
  sort_order: z.number().int().min(0).optional().default(0),
});

/**
 * Service Category Schema
 */
export const serviceCategoryFormSchema = z.object({
  name: z
    .string()
    .min(2, {
      message: "El nombre debe tener al menos 2 caracteres",
    })
    .max(50, {
      message: "El nombre no puede superar los 50 caracteres",
    })
    .trim(),
  description: z
    .string()
    .max(200, {
      message: "La descripción no puede superar los 200 caracteres",
    })
    .optional()
    .or(z.literal("")),
  icon: z
    .string()
    .max(50, {
      message: "El icono no puede superar los 50 caracteres",
    })
    .optional()
    .or(z.literal("")),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, {
      message: "Color inválido. Use formato hexadecimal (ej: #FF5733)",
    })
    .optional()
    .default("#6B7280"),
  sort_order: z.number().int().min(0).optional().default(0),
  is_active: z.boolean().optional().default(true),
});

/**
 * Service Update Schema (for partial updates)
 */
export const serviceUpdateSchema = serviceFormSchema.partial();

/**
 * Service Filter Schema
 */
export const serviceFilterSchema = z.object({
  category_id: z.string().uuid().optional(),
  is_active: z.boolean().optional(),
  available_for_online_booking: z.boolean().optional(),
  min_duration: z.number().int().min(0).optional(),
  max_duration: z.number().int().min(0).optional(),
});

/**
 * Staff Service Assignment Schema
 */
export const staffServiceSchema = z.object({
  staff_id: z.string().uuid({
    message: "ID de personal inválido",
  }),
  service_id: z.string().uuid({
    message: "ID de servicio inválido",
  }),
  proficiency_level: z.enum(["junior", "intermediate", "senior", "expert"], {
    message: "Nivel de competencia inválido",
  }),
});

// Type inference
export type ServiceFormInput = z.infer<typeof serviceFormSchema>;
export type ServiceCategoryFormInput = z.infer<
  typeof serviceCategoryFormSchema
>;
export type ServiceUpdateInput = z.infer<typeof serviceUpdateSchema>;
export type ServiceFilterInput = z.infer<typeof serviceFilterSchema>;
export type StaffServiceInput = z.infer<typeof staffServiceSchema>;
