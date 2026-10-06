/** Every business on the platform is in Cuba. */
export const DEFAULT_COUNTRY_CODE = "+53";

/**
 * The national number, without country code, repeated prefix or leading 0.
 * A number that starts with the country code counts as prefixed only when it
 * is longer than 8 digits: Cuban mobiles have 8 digits and many start with
 * "53" themselves (53077035), which used to lose its +53.
 */
export function nationalDigits(phone: string, countryCode: string): string {
  const cc = countryCode.replace(/\D/g, "");
  let digits = phone.replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (cc && digits.startsWith(cc) && digits.length > 8) {
    digits = digits.slice(cc.length);
  }
  return digits.replace(/^0+/, "");
}

/**
 * Canonical "+<digits>" form stored for customers. Same rule as
 * booking_phone_key (migration 054) and phoneToChatId in the edge functions.
 */
export function toInternationalPhone(
  phone: string,
  countryCode: string = DEFAULT_COUNTRY_CODE
): string {
  const raw = phone.trim();
  if (raw.startsWith("+")) return `+${raw.replace(/\D/g, "")}`;
  if (raw.replace(/\D/g, "").startsWith("00")) {
    return `+${raw.replace(/\D/g, "").slice(2)}`;
  }
  return `+${countryCode.replace(/\D/g, "")}${nationalDigits(raw, countryCode)}`;
}
