import moment from "moment";
import {
  DateOrder,
  DateSeparator,
  DecimalSeparator,
  ICurrencyPreferences,
  ILocalePreferences,
  IPreferences,
  ThousandsSeparator,
  WeekDay,
} from "store/userdata/userdata.types";

// ISO 3166-1 alpha-2; names come from Intl.DisplayNames
export const COUNTRIES = [
  "AD", "AE", "AF", "AG", "AL", "AM", "AO", "AR", "AT", "AU", "AZ", "BA", "BB",
  "BD", "BE", "BF", "BG", "BH", "BI", "BJ", "BN", "BO", "BR", "BS", "BT", "BW",
  "BY", "BZ", "CA", "CD", "CF", "CG", "CH", "CI", "CL", "CM", "CN", "CO", "CR",
  "CU", "CV", "CY", "CZ", "DE", "DJ", "DK", "DM", "DO", "DZ", "EC", "EE", "EG",
  "ER", "ES", "ET", "FI", "FJ", "FM", "FR", "GA", "GB", "GD", "GE", "GH", "GM",
  "GN", "GQ", "GR", "GT", "GW", "GY", "HK", "HN", "HR", "HT", "HU", "ID", "IE",
  "IL", "IN", "IQ", "IR", "IS", "IT", "JM", "JO", "JP", "KE", "KG", "KH", "KI",
  "KM", "KN", "KP", "KR", "KW", "KZ", "LA", "LB", "LC", "LI", "LK", "LR", "LS",
  "LT", "LU", "LV", "LY", "MA", "MC", "MD", "ME", "MG", "MH", "MK", "ML", "MM",
  "MN", "MO", "MR", "MT", "MU", "MV", "MW", "MX", "MY", "MZ", "NA", "NE", "NG",
  "NI", "NL", "NO", "NP", "NR", "NZ", "OM", "PA", "PE", "PG", "PH", "PK", "PL",
  "PR", "PS", "PT", "PW", "PY", "QA", "RO", "RS", "RU", "RW", "SA", "SB", "SC",
  "SD", "SE", "SG", "SI", "SK", "SL", "SM", "SN", "SO", "SR", "SS", "ST", "SV",
  "SY", "SZ", "TD", "TG", "TH", "TJ", "TL", "TM", "TN", "TO", "TR", "TT", "TV",
  "TW", "TZ", "UA", "UG", "US", "UY", "UZ", "VA", "VC", "VE", "VN", "VU", "WS",
  "XK", "YE", "ZA", "ZM", "ZW",
];

const DEFAULT_COUNTRY = "US";

// where Intl can't tell the first day of the week
const SUNDAY_FIRST = ["US", "CA", "JP", "BR", "IN", "MX", "IL", "PH", "KR", "TW", "ZA", "SA"];

export const DATE_ORDERS: DateOrder[] = ["DMY", "MDY", "YMD"];
export const DATE_SEPARATORS: DateSeparator[] = [".", "/", "-"];
export const DECIMAL_SEPARATORS: DecimalSeparator[] = [".", ","];
export const THOUSANDS_SEPARATORS: ThousandsSeparator[] = [",", ".", " ", "'", ""];

export type ILocalePreset = Required<Omit<ILocalePreferences, "country">>;

export interface IResolvedLocale extends ILocalePreset {
  // display formats for moment and for the datepicker (date-fns)
  momentDate: string;
  momentMonth: string;
  pickerDate: string;
  pickerMonth: string;
}

// The country's main language with the country, e.g. "DE" -> "de-DE".
// (A maximized tag with its script, "de-Latn-DE", gets wrong formats in some engines.)
export const countryLocaleTag = (country: string) => {
  try {
    return `${new Intl.Locale(`und-${country}`).maximize().language}-${country}`;
  } catch {
    return "en-US";
  }
};

const pick = <T extends string>(value: string, allowed: T[], fallback: T) =>
  allowed.includes(value as T) ? (value as T) : fallback;

// e.g. the narrow no-break space in "1 234,5" or the typographic apostrophe
const normalizeGroup = (group: string) =>
  /^\s$/.test(group) ? " " : group === "’" ? "'" : group;

const firstDayOf = (tag: string, country: string): WeekDay => {
  try {
    const locale = new Intl.Locale(tag) as Intl.Locale & {
      getWeekInfo?: () => { firstDay: number };
      weekInfo?: { firstDay: number };
    };
    const firstDay = (locale.getWeekInfo?.() ?? locale.weekInfo)?.firstDay;
    if (firstDay) {
      // Intl counts Monday..Sunday as 1..7
      return (firstDay % 7) as WeekDay;
    }
  } catch {
    // fall through to the list
  }
  return SUNDAY_FIRST.includes(country) ? 0 : 1;
};

const presets = new Map<string, ILocalePreset>();

// How the country writes dates and numbers.
export const getCountryPreset = (country: string): ILocalePreset => {
  const cached = presets.get(country);
  if (cached) {
    return cached;
  }

  const tag = countryLocaleTag(country);
  const numberParts = new Intl.NumberFormat(tag).formatToParts(12345.6);
  const partValue = (type: string) =>
    numberParts.find((p) => p.type === type)?.value ?? "";

  const dateParts = new Intl.DateTimeFormat(tag, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(2026, 0, 31));
  const order = dateParts
    .filter((p) => ["day", "month", "year"].includes(p.type))
    .map((p) => p.type[0].toUpperCase())
    .join("");
  const separator = dateParts.find((p) => p.type === "literal")?.value.trim()[0];

  const preset: ILocalePreset = {
    dateOrder: pick(order, DATE_ORDERS, "YMD"),
    dateSeparator: pick(separator ?? "", DATE_SEPARATORS, "-"),
    decimalSeparator: pick(partValue("decimal"), DECIMAL_SEPARATORS, "."),
    thousandsSeparator: pick(
      normalizeGroup(partValue("group")),
      THOUSANDS_SEPARATORS,
      ""
    ),
    firstDayOfWeek: firstDayOf(tag, country),
  };
  presets.set(country, preset);
  return preset;
};

const regionOf = (tag: string, maximize: boolean) => {
  try {
    const locale = new Intl.Locale(tag);
    return (maximize ? locale.maximize() : locale).region;
  } catch {
    return undefined;
  }
};

// The country of the browser's languages, e.g. "de-AT" -> "AT", "de" -> "DE".
export const detectCountry = (
  languages: readonly string[] = typeof navigator === "undefined"
    ? []
    : navigator.languages
) => {
  for (const maximize of [false, true]) {
    const country = languages
      .map((l) => regionOf(l, maximize))
      .find((r) => !!r && COUNTRIES.includes(r));
    if (country) {
      return country;
    }
  }
  return DEFAULT_COUNTRY;
};

export const defaultPreferences = (): IPreferences => ({
  locale: { country: detectCountry() },
  showLanguageInHeader: true,
  currency: {
    symbol: "",
    position: "after",
    decimals: 2,
    negativeStyle: "minus",
  },
  idleTimeoutMinutes: 10,
  theme: "auto",
});

// Stored preferences may be missing (older data) or partial.
export const withDefaults = (prefs?: Partial<IPreferences>): IPreferences => {
  const defaults = defaultPreferences();
  return {
    ...defaults,
    ...prefs,
    locale: { ...defaults.locale, ...prefs?.locale },
    currency: { ...defaults.currency, ...prefs?.currency },
  };
};

const datePattern = (order: string, sep: string, y: string, m: string, d: string) =>
  order
    .split("")
    .map((c) => (c === "Y" ? y : c === "M" ? m : d))
    .join(sep);

export const resolveLocale = (prefs: ILocalePreferences): IResolvedLocale => {
  const preset = getCountryPreset(prefs.country);
  // only the set overrides win (an undefined key must not hide the preset)
  const overrides = Object.fromEntries(
    Object.entries(prefs).filter(([k, v]) => k !== "country" && v !== undefined)
  );
  const locale: ILocalePreset = { ...preset, ...overrides };
  const sep = locale.dateSeparator;
  const monthOrder = locale.dateOrder === "YMD" ? "YM" : "MY";

  return {
    ...locale,
    momentDate: datePattern(locale.dateOrder, sep, "YYYY", "MM", "DD"),
    momentMonth: datePattern(monthOrder, sep, "YYYY", "MM", "DD"),
    pickerDate: datePattern(locale.dateOrder, sep, "yyyy", "MM", "dd"),
    pickerMonth: datePattern(monthOrder, sep, "yyyy", "MM", "dd"),
  };
};

export interface IFormatter {
  locale: IResolvedLocale;
  currency: ICurrencyPreferences;
  // with the currency settings (decimals, symbol, negatives)
  formatAmount: (value: number) => string;
  // separators only, e.g. for an amount being edited
  formatNumber: (value: number, digits?: number) => string;
  formatDate: (date: moment.MomentInput) => string;
  formatMonth: (date: moment.MomentInput) => string;
  // undefined for empty text, NaN for text that is not a number
  parseAmount: (text: string) => number | undefined;
  // a date typed in the user's format (or ISO); undefined if it isn't one
  parseDate: (text: string) => moment.Moment | undefined;
}

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const createFormatter = (prefs: IPreferences): IFormatter => {
  const locale = resolveLocale(prefs.locale);
  const { currency } = prefs;
  const { decimalSeparator: decimal, thousandsSeparator: group } = locale;

  // digits undefined: as many as the number has
  const formatNumber = (value: number, digits?: number) => {
    const fixed =
      digits === undefined ? String(Math.abs(value)) : Math.abs(value).toFixed(digits);
    const [int, frac] = fixed.split(".");
    const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, group);
    // no "-0.00"
    const negative = value < 0 && Number(fixed) !== 0;
    return `${negative ? "-" : ""}${grouped}${frac ? decimal + frac : ""}`;
  };

  const formatAmount = (value: number) => {
    const number = formatNumber(Math.abs(value), currency.decimals);
    const body = !currency.symbol
      ? number
      : currency.position === "before"
        ? `${currency.symbol}${number}`
        : `${number} ${currency.symbol}`;
    const negative =
      value < 0 && Number(Math.abs(value).toFixed(currency.decimals)) !== 0;
    if (!negative) {
      return body;
    }
    return currency.negativeStyle === "parentheses" ? `(${body})` : `-${body}`;
  };

  // spaces, apostrophes and the group separator are only for reading
  const ignored = new RegExp(`[\\s'’${group ? escapeRegExp(group) : ""}]`, "g");
  const parseAmount = (text: string) => {
    const trimmed = text.trim();
    if (trimmed === "") {
      return undefined;
    }
    const normalized = trimmed.replace(ignored, "").replace(decimal, ".");
    return /^[-+]?(\d+\.?\d*|\.\d+)$/.test(normalized) ? Number(normalized) : NaN;
  };

  const parseDate = (text: string) => {
    const date = moment(text.trim(), [locale.momentDate, "YYYY-MM-DD"], true);
    return date.isValid() ? date : undefined;
  };

  return {
    locale,
    currency,
    formatAmount,
    formatNumber,
    formatDate: (date) => moment(date).format(locale.momentDate),
    formatMonth: (date) => moment(date).format(locale.momentMonth),
    parseAmount,
    parseDate,
  };
};

// Country names in the UI language, sorted.
export const getCountryOptions = (language: string) => {
  let names: Intl.DisplayNames | undefined;
  try {
    names = new Intl.DisplayNames([language], { type: "region" });
  } catch {
    names = undefined;
  }
  return COUNTRIES.map((c) => ({ value: c, label: names?.of(c) ?? c })).sort(
    (a, b) => a.label.localeCompare(b.label, language)
  );
};
