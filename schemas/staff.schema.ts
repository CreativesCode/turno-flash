import { z } from "zod";

/**
 * Phone validation regex (international format)
 */
const phoneRegex =
  /^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,9}$/;

/**
 * Time validation regex (HH:MM format)
 */
const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;

/**
 * Staff Member Form Data Schema
 */
export const staffFormSchema = z.object({
  user_id: z
    .string()
    .uuid({
      message: "ID de usuario inválido",
    })
    .nullable()
    .optional(),
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
  nickname: z
    .string()
    .max(30, {
      message: "El apodo no puede superar los 30 caracteres",
    })
    .optional()
    .or(z.literal("")),
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
    .optional()
    .or(z.literal("")),
  photo_url: z
    .string()
    .url({
      message: "URL de foto inválida",
    })
    .max(500)
    .optional()
    .or(z.literal("")),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, {
      message: "Color inválido. Use formato hexadecimal (ej: #FF5733)",
    })
    .optional()
    .default("#8B5CF6"),
  bio: z
    .string()
    .max(500, {
      message: "La biografía no puede superar los 500 caracteres",
    })
    .optional()
    .or(z.literal("")),
  specialties: z
    .array(
      z.string().max(50, {
        message: "Cada especialidad no puede superar los 50 caracteres",
      })
    )
    .max(10, {
      message: "No se pueden agregar más de 10 especialidades",
    })
    .optional(),
  is_active: z.boolean().optional().default(true),
  is_bookable: z.boolean().optional().default(true),
  accepts_online_bookings: z.boolean().optional().default(true),
  sort_order: z.number().int().min(0).optional().default(0),
});

/**
 * Staff Availability Schema
 */
export const staffAvailabilitySchema = z
  .object({
    day_of_week: z
      .number()
      .int()
      .min(0, {
        message: "El día de la semana debe ser entre 0 (Domingo) y 6 (Sábado)",
      })
      .max(6, {
        message: "El día de la semana debe ser entre 0 (Domingo) y 6 (Sábado)",
      }),
    start_time: z.string().regex(timeRegex, {
      message: "Hora de inicio inválida. Formato esperado: HH:MM",
    }),
    end_time: z.string().regex(timeRegex, {
      message: "Hora de fin inválida. Formato esperado: HH:MM",
    }),
    is_available: z.boolean().optional().default(true),
    effective_from: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, {
        message: "Fecha inválida. Formato esperado: YYYY-MM-DD",
      })
      .nullable()
      .optional(),
    effective_until: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, {
        message: "Fecha inválida. Formato esperado: YYYY-MM-DD",
      })
      .nullable()
      .optional(),
  })
  .refine(
    (data) => {
      // Validate that end_time is after start_time
      const [startHour, startMin] = data.start_time.split(":").map(Number);
      const [endHour, endMin] = data.end_time.split(":").map(Number);
      const startMinutes = startHour * 60 + startMin;
      const endMinutes = endHour * 60 + endMin;
      return endMinutes > startMinutes;
    },
    {
      message: "La hora de fin debe ser posterior a la hora de inicio",
      path: ["end_time"],
    }
  )
  .refine(
    (data) => {
      // Validate effective dates
      if (data.effective_from && data.effective_until) {
        return new Date(data.effective_from) <= new Date(data.effective_until);
      }
      return true;
    },
    {
      message: "La fecha de inicio debe ser anterior a la fecha de fin",
      path: ["effective_until"],
    }
  );

/**
 * Staff Exception Schema
 */
export const staffExceptionSchema = z
  .object({
    staff_id: z
      .string()
      .uuid({
        message: "ID de personal inválido",
      })
      .nullable()
      .optional(),
    exception_type: z.enum(
      ["time_off", "holiday", "special_hours", "blocked"],
      {
        message: "Tipo de excepción inválido",
      }
    ),
    start_datetime: z.string().datetime({
      message: "Fecha y hora de inicio inválida",
    }),
    end_datetime: z.string().datetime({
      message: "Fecha y hora de fin inválida",
    }),
    title: z
      .string()
      .min(2, {
        message: "El título debe tener al menos 2 caracteres",
      })
      .max(100, {
        message: "El título no puede superar los 100 caracteres",
      }),
    description: z
      .string()
      .max(500, {
        message: "La descripción no puede superar los 500 caracteres",
      })
      .optional()
      .or(z.literal("")),
    is_recurring: z.boolean().optional().default(false),
  })
  .refine(
    (data) => {
      // Validate that end_datetime is after start_datetime
      return new Date(data.end_datetime) > new Date(data.start_datetime);
    },
    {
      message: "La fecha de fin debe ser posterior a la fecha de inicio",
      path: ["end_datetime"],
    }
  );

/**
 * Time Off Request Schema
 */
export const timeOffRequestSchema = z
  .object({
    staff_id: z.string().uuid({
      message: "ID de personal inválido",
    }),
    time_off_type: z.enum(
      ["vacation", "sick_leave", "personal", "unpaid", "other"],
      {
        message: "Tipo de ausencia inválido",
      }
    ),
    start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, {
      message: "Fecha de inicio inválida. Formato esperado: YYYY-MM-DD",
    }),
    end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, {
      message: "Fecha de fin inválida. Formato esperado: YYYY-MM-DD",
    }),
    reason: z
      .string()
      .max(500, {
        message: "La razón no puede superar los 500 caracteres",
      })
      .optional(),
  })
  .refine(
    (data) => {
      return new Date(data.end_date) >= new Date(data.start_date);
    },
    {
      message:
        "La fecha de fin debe ser igual o posterior a la fecha de inicio",
      path: ["end_date"],
    }
  );

/**
 * Staff Update Schema (for partial updates)
 */
export const staffUpdateSchema = staffFormSchema.partial();

// Type inference
export type StaffFormInput = z.infer<typeof staffFormSchema>;
export type StaffAvailabilityInput = z.infer<typeof staffAvailabilitySchema>;
export type StaffExceptionInput = z.infer<typeof staffExceptionSchema>;
export type TimeOffRequestInput = z.infer<typeof timeOffRequestSchema>;
export type StaffUpdateInput = z.infer<typeof staffUpdateSchema>;
