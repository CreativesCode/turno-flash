import { z } from "zod";

/** "Registrar pago" (TUR0008): the same limits as appointment_payments (095). */
export const appointmentPaymentSchema = z
  .object({
    amount: z
      .number({ message: "Escribe el importe" })
      .positive("El importe tiene que ser mayor que 0")
      .max(99_999_999, "El importe es demasiado alto"),
    /** ISO */
    paidAt: z.string().min(1, "Elige la fecha del pago"),
    method: z.enum(["cash", "transfer", "card", "other"]),
    methodOther: z.string().trim().max(60, "Máximo 60 caracteres"),
    reference: z.string().trim().max(100, "Máximo 100 caracteres"),
    notes: z.string().trim().max(500, "Máximo 500 caracteres"),
  })
  .superRefine((value, ctx) => {
    if (value.method === "other" && !value.methodOther) {
      ctx.addIssue({
        code: "custom",
        path: ["methodOther"],
        message: "Escribe cuál es el método",
      });
    }
    // One day of margin, like the database: clocks of phones are not exact
    if (new Date(value.paidAt).getTime() > Date.now() + 86_400_000) {
      ctx.addIssue({
        code: "custom",
        path: ["paidAt"],
        message: "La fecha del pago no puede ser futura",
      });
    }
  });

export const voidPaymentReasonSchema = z
  .string()
  .trim()
  .min(1, "Escribe el motivo")
  .max(300, "Máximo 300 caracteres");
