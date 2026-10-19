"use client";

import { Card, Field, RichTextEditor } from "@/components/ui";

/**
 * How the customer pays the deposit of an appointment (TUR0003). A business
 * that also sells seats edits the same text in its trips card; this card is
 * for the ones that only take appointments.
 */
export function DepositInstructionsCard({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <Card className="mb-4 p-5">
      <Field
        label="Cómo se paga el anticipo"
        hint="Para los servicios que piden anticipo. Se lo mostramos al cliente al reservar y en el WhatsApp de su reserva."
      >
        <RichTextEditor
          label="Instrucciones de pago"
          value={value}
          onChange={onChange}
          rows={4}
          placeholder={
            "Ejemplo: *Transfiere el anticipo* a la tarjeta 9200 XXXX XXXX XXXX (tu nombre)." +
            "\n" +
            "Envíanos el comprobante por WhatsApp y te confirmamos el turno."
          }
        />
      </Field>
    </Card>
  );
}
