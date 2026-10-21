import { SERVICE_BADGE_KEYS, type ServiceBadgeKey } from "@/config/service-badges";
import { z } from "zod";

/** Long enough for a full package or price list, one item per line. */
export const SERVICE_DESCRIPTION_MAX = 1000;

/** Conditions of a service (migration 093). */
export const SERVICE_TERMS_MAX = 1000;

/**
 * Service Form Data Schema (without the cross-field rules, so it can be made partial)
 */
const serviceFormBaseSchema = z.object({
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
    .max(SERVICE_DESCRIPTION_MAX, {
      message: `La descripción no puede superar los ${SERVICE_DESCRIPTION_MAX} caracteres`,
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
  deposit_type: z.enum(["fixed", "percent"]).nullable().optional(),
  deposit_value: z
    .number()
    .positive({ message: "El anticipo debe ser mayor que 0" })
    .nullable()
    .optional(),
  deposit_due_hours: z
    .number()
    .int({ message: "Las horas deben ser un número entero" })
    .min(1, { message: "Mínimo 1 hora antes del turno" })
    .max(720, { message: "Máximo 720 horas (30 días) antes del turno" })
    .nullable()
    .optional(),
  payment_terms: z
    .string()
    .max(SERVICE_TERMS_MAX, {
      message: `Las condiciones no pueden superar los ${SERVICE_TERMS_MAX} caracteres`,
    })
    .nullable()
    .optional(),
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
  sort_order: z.number().int().min(0).optional(),
  badge: z
    .enum(SERVICE_BADGE_KEYS as [ServiceBadgeKey, ...ServiceBadgeKey[]], {
      message: "Marca inválida",
    })
    .nullable()
    .optional(),
});

type DepositFields = {
  deposit_type?: "fixed" | "percent" | null;
  deposit_value?: number | null;
  price?: number | null;
};

/** The deposit rules of migration 090: a fixed one up to the price, a percentage 1-100. */
function checkDeposit(data: DepositFields, ctx: z.RefinementCtx) {
  if (!data.deposit_type) return;
  const value = data.deposit_value;
  if (value == null) {
    ctx.addIssue({
      code: "custom",
      path: ["deposit_value"],
      message: "Indica el importe o el porcentaje del anticipo",
    });
  } else if (data.deposit_type === "percent" && value > 100) {
    ctx.addIssue({
      code: "custom",
      path: ["deposit_value"],
      message: "El porcentaje no puede superar 100",
    });
  } else if (
    data.deposit_type === "fixed" &&
    data.price != null &&
    value > data.price
  ) {
    ctx.addIssue({
      code: "custom",
      path: ["deposit_value"],
      message: "El anticipo no puede ser mayor que el precio",
    });
  }
}

export const serviceFormSchema = serviceFormBaseSchema.superRefine(checkDeposit);

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
export const serviceUpdateSchema = serviceFormBaseSchema
  .partial()
  .superRefine(checkDeposit);

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
