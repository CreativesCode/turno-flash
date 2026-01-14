import { z } from "zod";

/**
 * Appointment Status Schema
 */
export const appointmentStatusSchema = z.enum([
  "pending",
  "confirmed",
  "reminded",
  "client_confirmed",
  "checked_in",
  "in_progress",
  "completed",
  "cancelled",
  "no_show",
  "rescheduled",
]);

/**
 * Appointment Source Schema
 */
export const appointmentSourceSchema = z.enum([
  "web",
  "whatsapp",
  "phone",
  "walk_in",
  "admin",
]);

/**
 * Time validation regex (HH:MM format)
 */
const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;

/**
 * Appointment Form Data Schema
 */
export const appointmentFormSchema = z
  .object({
    customer_id: z.string().uuid({
      message: "ID de cliente inválido",
    }),
    service_id: z.string().uuid({
      message: "ID de servicio inválido",
    }),
    staff_id: z
      .string()
      .uuid({
        message: "ID de personal inválido",
      })
      .nullable()
      .optional(),
    appointment_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, {
      message: "Fecha inválida. Formato esperado: YYYY-MM-DD",
    }),
    start_time: z.string().regex(timeRegex, {
      message: "Hora de inicio inválida. Formato esperado: HH:MM",
    }),
    end_time: z.string().regex(timeRegex, {
      message: "Hora de fin inválida. Formato esperado: HH:MM",
    }),
    status: appointmentStatusSchema.optional().default("pending"),
    source: appointmentSourceSchema.optional().default("admin"),
    notes: z
      .string()
      .max(500, {
        message: "Las notas no pueden superar los 500 caracteres",
      })
      .optional(),
    internal_notes: z
      .string()
      .max(500, {
        message: "Las notas internas no pueden superar los 500 caracteres",
      })
      .optional(),
    price_charged: z
      .number()
      .min(0, {
        message: "El precio no puede ser negativo",
      })
      .nullable()
      .optional(),
    was_paid: z.boolean().optional().default(false),
    payment_method: z.string().max(50).optional(),
  })
  .refine(
    (data) => {
      // Validate that end_time is after start_time
      if (data.start_time && data.end_time) {
        const [startHour, startMin] = data.start_time.split(":").map(Number);
        const [endHour, endMin] = data.end_time.split(":").map(Number);
        const startMinutes = startHour * 60 + startMin;
        const endMinutes = endHour * 60 + endMin;
        return endMinutes > startMinutes;
      }
      return true;
    },
    {
      message: "La hora de fin debe ser posterior a la hora de inicio",
      path: ["end_time"],
    }
  )
  .refine(
    (data) => {
      // Validate appointment date is not in the past
      const appointmentDate = new Date(data.appointment_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return appointmentDate >= today;
    },
    {
      message: "La fecha del turno no puede ser en el pasado",
      path: ["appointment_date"],
    }
  );

/**
 * Appointment Update Status Schema
 */
export const appointmentUpdateStatusSchema = z.object({
  appointmentId: z.string().uuid({
    message: "ID de turno inválido",
  }),
  newStatus: appointmentStatusSchema,
  reason: z
    .string()
    .max(200, {
      message: "La razón no puede superar los 200 caracteres",
    })
    .optional(),
});

/**
 * Send Reminder Schema
 */
export const sendReminderSchema = z.object({
  appointmentId: z.string().uuid({
    message: "ID de turno inválido",
  }),
  method: z.enum(["whatsapp", "sms", "email"]).default("whatsapp"),
});

/**
 * Check Availability Schema
 */
export const checkAvailabilitySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, {
    message: "Fecha inválida. Formato esperado: YYYY-MM-DD",
  }),
  startTime: z.string().regex(timeRegex, {
    message: "Hora de inicio inválida. Formato esperado: HH:MM",
  }),
  endTime: z.string().regex(timeRegex, {
    message: "Hora de fin inválida. Formato esperado: HH:MM",
  }),
  staffId: z.string().uuid({
    message: "ID de personal inválido",
  }),
  excludeAppointmentId: z.string().uuid().optional(),
});

/**
 * Appointment Request Schema
 */
export const appointmentRequestSchema = z.object({
  customer_name: z
    .string()
    .min(2, {
      message: "El nombre debe tener al menos 2 caracteres",
    })
    .max(100, {
      message: "El nombre no puede superar los 100 caracteres",
    }),
  customer_phone: z
    .string()
    .min(8, {
      message: "El teléfono debe tener al menos 8 dígitos",
    })
    .max(20, {
      message: "El teléfono no puede superar los 20 caracteres",
    }),
  customer_email: z
    .string()
    .email({
      message: "Email inválido",
    })
    .optional(),
  service_id: z.string().uuid({
    message: "ID de servicio inválido",
  }),
  preferred_staff_id: z
    .string()
    .uuid({
      message: "ID de personal inválido",
    })
    .nullable()
    .optional(),
  preferred_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, {
    message: "Fecha inválida. Formato esperado: YYYY-MM-DD",
  }),
  preferred_time: z.string().regex(timeRegex, {
    message: "Hora inválida. Formato esperado: HH:MM",
  }),
  alternative_dates: z.record(z.string(), z.unknown()).optional(),
  notes: z
    .string()
    .max(500, {
      message: "Las notas no pueden superar los 500 caracteres",
    })
    .optional(),
  source: z.string(),
});

// Type inference
export type AppointmentFormInput = z.infer<typeof appointmentFormSchema>;
export type AppointmentUpdateStatusInput = z.infer<
  typeof appointmentUpdateStatusSchema
>;
export type SendReminderInput = z.infer<typeof sendReminderSchema>;
export type CheckAvailabilityInput = z.infer<typeof checkAvailabilitySchema>;
export type AppointmentRequestInput = z.infer<typeof appointmentRequestSchema>;
