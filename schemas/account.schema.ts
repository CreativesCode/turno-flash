import { z } from "zod";

/** What a user can change about themselves in "Mi cuenta". */
export const accountNameSchema = z.object({
  full_name: z
    .string()
    .trim()
    .min(2, "Escribe tu nombre")
    .max(80, "Máximo 80 caracteres"),
});

/** The owner's own WhatsApp, where the notices about the subscription go. */
export const accountPhoneSchema = z.object({
  owner_phone: z
    .string()
    .trim()
    .regex(
      /^\+?[\d\s-]{8,20}$/,
      "Escribe un WhatsApp válido, por ejemplo +53 5 123 4567",
    ),
});

export const accountPasswordSchema = z
  .object({
    current: z.string().min(1, "Escribe tu contraseña actual"),
    password: z
      .string()
      .min(6, "La contraseña debe tener al menos 6 caracteres"),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, {
    path: ["confirm"],
    message: "Las contraseñas no coinciden",
  });
