"use client";

import { Button, Card, Field, sheetInputClasses } from "@/components/ui";
import { useAuth } from "@/contexts/auth-context";
import { useToast } from "@/hooks";
import { businessContactSchema } from "@/schemas/business-contact.schema";
import { Logger } from "@/utils/logger";
import { toInternationalPhone } from "@/utils/phone";
import { createClient } from "@/utils/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { MessageCircle } from "lucide-react";
import { useState } from "react";

interface ContactValues {
  contact_name: string;
  whatsapp_phone: string;
}

function ContactForm({
  organizationId,
  initial,
}: {
  organizationId: string;
  initial: ContactValues;
}) {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const toast = useToast();
  const [values, setValues] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const canEdit = profile?.role === "admin" || profile?.role === "owner";
  const dirty =
    values.contact_name !== initial.contact_name ||
    values.whatsapp_phone !== initial.whatsapp_phone;

  const handleSave = async () => {
    const parsed = businessContactSchema.safeParse(values);
    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      return;
    }
    setError(null);
    setSaving(true);
    try {
      const supabase = createClient();
      const { error: updateError } = await supabase
        .from("organizations")
        .update({
          contact_name: parsed.data.contact_name || null,
          whatsapp_phone: parsed.data.whatsapp_phone
            ? toInternationalPhone(parsed.data.whatsapp_phone)
            : null,
        })
        .eq("id", organizationId);
      if (updateError) throw updateError;
      await queryClient.invalidateQueries({ queryKey: ["org-contact", organizationId] });
      toast.success("Contacto guardado", "Lo verán tus clientes en los mensajes");
    } catch (saveError) {
      void Logger.error("Error saving business contact", saveError, { organizationId });
      toast.error("Error", "No se pudo guardar el contacto");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-3 sm:max-w-md">
      <Field label="Persona que atiende" hint="Por ejemplo: Ana. Si lo dejas vacío, se usa el nombre del negocio.">
        <input
          type="text"
          autoComplete="name"
          maxLength={60}
          value={values.contact_name}
          disabled={!canEdit || saving}
          onChange={(e) => setValues({ ...values, contact_name: e.target.value })}
          className={sheetInputClasses}
        />
      </Field>
      <Field
        label="WhatsApp del negocio"
        hint="Aquí te llegan los avisos de nuevas reservas. Sin este número, los mensajes no dicen a quién escribir."
      >
        <input
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="+53 5 123 4567"
          value={values.whatsapp_phone}
          disabled={!canEdit || saving}
          onChange={(e) => setValues({ ...values, whatsapp_phone: e.target.value })}
          className={sheetInputClasses}
        />
      </Field>
      {error && <p className="text-xs text-danger-600">{error}</p>}
      {canEdit && (
        <Button
          variant="mesh-primary"
          onClick={handleSave}
          disabled={!dirty || saving}
          className="self-start"
        >
          {saving ? "Guardando…" : "Guardar"}
        </Button>
      )}
    </div>
  );
}

/**
 * The person and number customers should write to. WhatsApp messages go out
 * from an automated number that only understands OK/CANCELAR, so they point
 * here whenever the customer may need to talk to someone.
 */
export function ContactCard({ organizationId }: { organizationId: string }) {
  const { data } = useQuery({
    queryKey: ["org-contact", organizationId],
    queryFn: async (): Promise<ContactValues> => {
      const supabase = createClient();
      const { data: org, error } = await supabase
        .from("organizations")
        .select("contact_name, whatsapp_phone")
        .eq("id", organizationId)
        .single();
      if (error) throw error;
      return {
        contact_name: org.contact_name ?? "",
        whatsapp_phone: org.whatsapp_phone ?? "",
      };
    },
  });

  return (
    <Card className="mb-4 p-4 sm:p-5">
      <div className="mb-3 flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface-2 text-foreground-muted">
          <MessageCircle className="h-4.5 w-4.5" />
        </div>
        <div>
          <div className="text-sm font-bold text-foreground">Contacto para tus clientes</div>
          <p className="mt-0.5 text-xs leading-relaxed text-foreground-muted">
            Los avisos de WhatsApp salen de un número automático que no lee
            mensajes. Cuando el cliente pueda necesitar hablar con alguien, el
            mensaje le dice que escriba a esta persona y número.
          </p>
        </div>
      </div>
      {data && (
        <ContactForm
          key={`${data.contact_name}|${data.whatsapp_phone}`}
          organizationId={organizationId}
          initial={data}
        />
      )}
    </Card>
  );
}
