/**
 * Phone country codes for the public booking form. Country names come from
 * Intl.DisplayNames, so only ISO code → dial code is stored here.
 */
const DIAL_CODES: Record<string, string> = {
  AD: "376", AE: "971", AF: "93", AG: "1", AI: "1", AL: "355", AM: "374", AO: "244",
  AR: "54", AS: "1", AT: "43", AU: "61", AW: "297", AZ: "994", BA: "387", BB: "1",
  BD: "880", BE: "32", BF: "226", BG: "359", BH: "973", BI: "257", BJ: "229", BL: "590",
  BM: "1", BN: "673", BO: "591", BQ: "599", BR: "55", BS: "1", BT: "975", BW: "267",
  BY: "375", BZ: "501", CA: "1", CD: "243", CF: "236", CG: "242", CH: "41", CI: "225",
  CK: "682", CL: "56", CM: "237", CN: "86", CO: "57", CR: "506", CU: "53", CV: "238",
  CW: "599", CY: "357", CZ: "420", DE: "49", DJ: "253", DK: "45", DM: "1", DO: "1",
  DZ: "213", EC: "593", EE: "372", EG: "20", ER: "291", ES: "34", ET: "251", FI: "358",
  FJ: "679", FK: "500", FM: "691", FO: "298", FR: "33", GA: "241", GB: "44", GD: "1",
  GE: "995", GF: "594", GH: "233", GI: "350", GL: "299", GM: "220", GN: "224", GP: "590",
  GQ: "240", GR: "30", GT: "502", GU: "1", GW: "245", GY: "592", HK: "852", HN: "504",
  HR: "385", HT: "509", HU: "36", ID: "62", IE: "353", IL: "972", IN: "91", IQ: "964",
  IR: "98", IS: "354", IT: "39", JM: "1", JO: "962", JP: "81", KE: "254", KG: "996",
  KH: "855", KI: "686", KM: "269", KN: "1", KP: "850", KR: "82", KW: "965", KY: "1",
  KZ: "7", LA: "856", LB: "961", LC: "1", LI: "423", LK: "94", LR: "231", LS: "266",
  LT: "370", LU: "352", LV: "371", LY: "218", MA: "212", MC: "377", MD: "373", ME: "382",
  MF: "590", MG: "261", MH: "692", MK: "389", ML: "223", MM: "95", MN: "976", MO: "853",
  MQ: "596", MR: "222", MS: "1", MT: "356", MU: "230", MV: "960", MW: "265", MX: "52",
  MY: "60", MZ: "258", NA: "264", NC: "687", NE: "227", NG: "234", NI: "505", NL: "31",
  NO: "47", NP: "977", NR: "674", NZ: "64", OM: "968", PA: "507", PE: "51", PF: "689",
  PG: "675", PH: "63", PK: "92", PL: "48", PM: "508", PR: "1", PS: "970", PT: "351",
  PW: "680", PY: "595", QA: "974", RE: "262", RO: "40", RS: "381", RU: "7", RW: "250",
  SA: "966", SB: "677", SC: "248", SD: "249", SE: "46", SG: "65", SI: "386", SK: "421",
  SL: "232", SM: "378", SN: "221", SO: "252", SR: "597", SS: "211", ST: "239", SV: "503",
  SX: "1", SY: "963", SZ: "268", TC: "1", TD: "235", TG: "228", TH: "66", TJ: "992",
  TL: "670", TM: "993", TN: "216", TO: "676", TR: "90", TT: "1", TV: "688", TW: "886",
  TZ: "255", UA: "380", UG: "256", US: "1", UY: "598", UZ: "998", VA: "39", VC: "1",
  VE: "58", VG: "1", VN: "84", VU: "678", WS: "685", XK: "383", YE: "967", ZA: "27",
  ZM: "260", ZW: "263",
};

/** Timezones that identify a country (device or business timezone). */
const TIMEZONE_COUNTRY: Record<string, string> = {
  "America/Havana": "CU",
  "America/Mexico_City": "MX", "America/Cancun": "MX", "America/Merida": "MX",
  "America/Monterrey": "MX", "America/Chihuahua": "MX", "America/Hermosillo": "MX",
  "America/Mazatlan": "MX", "America/Tijuana": "MX", "America/Matamoros": "MX",
  "America/Bogota": "CO", "America/Lima": "PE", "America/Santiago": "CL",
  "America/Caracas": "VE", "America/Guayaquil": "EC", "America/Montevideo": "UY",
  "America/Asuncion": "PY", "America/La_Paz": "BO", "America/Panama": "PA",
  "America/Costa_Rica": "CR", "America/Managua": "NI", "America/Tegucigalpa": "HN",
  "America/El_Salvador": "SV", "America/Guatemala": "GT", "America/Belize": "BZ",
  "America/Santo_Domingo": "DO", "America/Puerto_Rico": "PR", "America/Port-au-Prince": "HT",
  "America/Jamaica": "JM", "America/Nassau": "BS", "America/Port_of_Spain": "TT",
  "America/Barbados": "BB", "America/Cayman": "KY", "America/Curacao": "CW",
  "America/Aruba": "AW", "America/Martinique": "MQ", "America/Guadeloupe": "GP",
  "America/Cayenne": "GF", "America/Paramaribo": "SR", "America/Guyana": "GY",
  "America/Sao_Paulo": "BR", "America/Fortaleza": "BR", "America/Recife": "BR",
  "America/Bahia": "BR", "America/Belem": "BR", "America/Manaus": "BR",
  "America/New_York": "US", "America/Chicago": "US", "America/Denver": "US",
  "America/Los_Angeles": "US", "America/Phoenix": "US", "America/Anchorage": "US",
  "America/Detroit": "US", "Pacific/Honolulu": "US",
  "America/Toronto": "CA", "America/Vancouver": "CA", "America/Edmonton": "CA",
  "America/Winnipeg": "CA", "America/Halifax": "CA", "America/St_Johns": "CA",
  "Europe/Madrid": "ES", "Atlantic/Canary": "ES", "Europe/Lisbon": "PT",
  "Europe/Paris": "FR", "Europe/Berlin": "DE", "Europe/Rome": "IT", "Europe/London": "GB",
  "Europe/Dublin": "IE", "Europe/Amsterdam": "NL", "Europe/Brussels": "BE",
  "Europe/Zurich": "CH", "Europe/Vienna": "AT", "Europe/Moscow": "RU",
  "Europe/Stockholm": "SE", "Europe/Oslo": "NO", "Europe/Copenhagen": "DK",
  "Europe/Warsaw": "PL", "Europe/Prague": "CZ", "Europe/Athens": "GR",
  "Europe/Istanbul": "TR", "Europe/Kyiv": "UA", "Europe/Kiev": "UA",
};

const TIMEZONE_PREFIX_COUNTRY: [prefix: string, iso: string][] = [
  ["America/Argentina/", "AR"],
  ["America/Indiana/", "US"],
  ["America/Kentucky/", "US"],
];

/** Fallback when nothing matches: the product targets Cuba first. */
const DEFAULT_COUNTRY = "CU";

export interface PhoneCountry {
  iso: string;
  dialCode: string;
  name: string;
}

function countryName(names: Intl.DisplayNames | null, iso: string): string {
  try {
    return names?.of(iso) ?? iso;
  } catch {
    return iso;
  }
}

function buildCountries(): PhoneCountry[] {
  let names: Intl.DisplayNames | null = null;
  try {
    names = new Intl.DisplayNames(["es"], { type: "region" });
  } catch {
    names = null;
  }
  return Object.entries(DIAL_CODES)
    .map(([iso, dial]) => ({ iso, dialCode: `+${dial}`, name: countryName(names, iso) }))
    .sort((a, b) => a.name.localeCompare(b.name, "es"));
}

/** Every country, sorted by its Spanish name. */
export const PHONE_COUNTRIES = buildCountries();

export function dialCodeOf(iso: string): string {
  return `+${DIAL_CODES[iso] ?? DIAL_CODES[DEFAULT_COUNTRY]}`;
}

function countryFromTimezone(timezone: string | undefined): string | undefined {
  if (!timezone) return undefined;
  return (
    TIMEZONE_COUNTRY[timezone] ??
    TIMEZONE_PREFIX_COUNTRY.find(([prefix]) => timezone.startsWith(prefix))?.[1]
  );
}

function countryFromLanguages(): string | undefined {
  if (typeof navigator === "undefined") return undefined;
  for (const tag of navigator.languages ?? []) {
    const region = /-([A-Za-z]{2})(?=-|$)/.exec(tag)?.[1]?.toUpperCase();
    if (region && region in DIAL_CODES) return region;
  }
  return undefined;
}

/**
 * Best guess of the customer's phone country, without any network call:
 * the device timezone first (set by the phone itself; more reliable than IP
 * geolocation in Cuba, where VPNs are common), then the business timezone,
 * then the browser language region.
 */
export function guessPhoneCountry(businessTimezone: string): string {
  let deviceTimezone: string | undefined;
  try {
    deviceTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    deviceTimezone = undefined;
  }
  const candidates = [
    countryFromTimezone(deviceTimezone),
    countryFromTimezone(businessTimezone),
    countryFromLanguages(),
  ];
  return candidates.find((c) => c && c in DIAL_CODES) ?? DEFAULT_COUNTRY;
}
