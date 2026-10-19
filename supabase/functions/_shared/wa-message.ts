// Common frame of every WhatsApp message to a customer.
//
// Messages go out from an automated number. It understands OK/CANCELAR (and a
// 1-5 rating) and nothing else: a customer who writes anything else there
// reaches nobody. So every message says which business it is and that it is
// automatic, and the ones where the customer is likely to need a person also
// say who to write to (the business contact, set by the owner in Settings).

export interface BusinessContact {
  name: string;
  /** Person who answers customers; falls back to the business name. */
  contactName: string | null;
  /** Business WhatsApp (organizations.whatsapp_phone), the one that answers. */
  phone: string | null;
}

/** What the automated number accepts as an answer to this message. */
/** deposit: also "PAGUÉ" and a photo of the receipt (appointment deposits, 090). */
export type ReplyMode = "keywords" | "deposit" | "rating" | "none";

export interface FrameOptions {
  /** Add "¿Dudas? Escribe a ..." with the business contact. */
  contact: boolean;
  reply: ReplyMode;
}

const REPLY_NOTE: Record<ReplyMode, string> = {
  keywords: "Mensaje automático de Turno Flash. Por aquí solo entendemos *OK* y *CANCELAR*.",
  deposit:
    "Mensaje automático de Turno Flash. Por aquí solo entendemos *PAGUÉ*, la foto del comprobante y *CANCELAR*.",
  rating: "Mensaje automático de Turno Flash.",
  none: "Mensaje automático de Turno Flash. No respondas a este número.",
};

/** "+53 5 307 7035" for Cuban mobiles; anything else as stored. */
function prettyPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10 && digits.startsWith("535")) {
    return `+53 ${digits.slice(2, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
  }
  return phone;
}

export function frameCustomerMessage(
  business: BusinessContact,
  body: string,
  options: FrameOptions,
  /** Appointment code ("ES-0004"): named in the note so the reply matches it. */
  code: string | null = null
): string {
  const lines = [`*${business.name}*`, "", body];
  if (options.contact && business.phone) {
    const who = business.contactName?.trim() || business.name;
    lines.push("", `💬 ¿Dudas? Escribe a *${who}* al ${prettyPhone(business.phone)}`);
  }
  const note =
    options.reply === "keywords" && code
      ? `Mensaje automático de Turno Flash. Por aquí solo entendemos *OK ${code}* y *CANCELAR ${code}*.`
      : options.reply === "deposit" && code
        ? `Mensaje automático de Turno Flash. Por aquí solo entendemos *PAGUÉ ${code}*, la foto del comprobante y *CANCELAR ${code}*.`
        : REPLY_NOTE[options.reply];
  lines.push("", `_${note}_`);
  return lines.join("\n");
}

/** "500 US$" / "8.500 CUP", the way the customer reads an amount. */
export function money(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat("es", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
      useGrouping: "always",
    }).format(amount);
  } catch {
    return `${amount} ${currency}`;
  }
}
