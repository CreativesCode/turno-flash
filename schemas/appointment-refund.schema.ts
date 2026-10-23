import { z } from "zod";

const method = z.enum(["cash", "transfer", "card", "other"]);

/** "Registrar devolución" (TUR0010): the same limits as appointment_refunds (097). */
export const appointmentRefundSchema = z
  .object({
    amount: z
      .number({ message: "Escribe el importe" })
      .positive("El importe tiene que ser mayor que 0"),
    /** What is left to refund: paid minus refunded and pending */
    available: z.number(),
    reason: z.string().trim().min(1, "Escribe el motivo").max(300, "Máximo 300 caracteres"),
    processed: z.boolean(),
    method: method.nullable(),
    methodOther: z.string().trim().max(60, "Máximo 60 caracteres"),
    /** ISO or "" */
    refundedAt: z.string(),
  })
  .superRefine((value, ctx) => {
    if (value.amount > value.available) {
      ctx.addIssue({
        code: "custom",
        path: ["amount"],
        message: "Es más de lo que queda por devolver",
      });
    }
    if (value.processed) refineProcessed(value, ctx);
  });

/** "Marcar devuelta": how and when the money went back. */
export const processRefundSchema = z
  .object({
    method,
    methodOther: z.string().trim().max(60, "Máximo 60 caracteres"),
    refundedAt: z.string(),
  })
  .superRefine((value, ctx) => refineProcessed(value, ctx));

export const rejectRefundReasonSchema = z
  .string()
  .trim()
  .min(1, "Escribe el motivo")
  .max(300, "Máximo 300 caracteres");

function refineProcessed(
  value: { method: string | null; methodOther: string; refundedAt: string },
  ctx: z.RefinementCtx
) {
  if (!value.method) {
    ctx.addIssue({ code: "custom", path: ["method"], message: "Elige cómo lo devolviste" });
  }
  if (value.method === "other" && !value.methodOther) {
    ctx.addIssue({ code: "custom", path: ["methodOther"], message: "Escribe cuál es el método" });
  }
  // One day of margin, like the database: clocks of phones are not exact
  if (!value.refundedAt) {
    ctx.addIssue({ code: "custom", path: ["refundedAt"], message: "Elige la fecha" });
  } else if (new Date(value.refundedAt).getTime() > Date.now() + 86_400_000) {
    ctx.addIssue({ code: "custom", path: ["refundedAt"], message: "La fecha no puede ser futura" });
  }
}
