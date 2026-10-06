import { z } from "zod";

/**
 * Who customers write to: shown in the WhatsApp messages sent from the
 * automated number, which cannot hold a conversation. The phone also receives
 * the business notifications (new bookings, cancellations).
 */
export const businessContactSchema = z.object({
  contact_name: z.string().trim().max(60, "Máximo 60 caracteres"),
  whatsapp_phone: z
    .string()
    .trim()
    .regex(/^\+?[\d\s-]{8,20}$/, "Escribe un WhatsApp válido, por ejemplo +53 5 123 4567")
    .or(z.literal("")),
});

export type BusinessContactInput = z.infer<typeof businessContactSchema>;
