import { z } from "zod";
import { IPreferences, Theme } from "store/userdata/userdata.types";

// form value of "use the country's value" ("" is a real choice: no separator)
export const COUNTRY_DEFAULT = "default";

export const LANGUAGES = ["en", "ru"];
export const IDLE_TIMEOUTS = [5, 10, 15, 30, 60];
export const THEMES: Theme[] = ["auto", "light", "dark"];
export const WEEK_DAYS = [1, 2, 3, 4, 5, 6, 0];

const choice = z.union([z.string(), z.number()]);
export const schema = z.object({
  country: z.string(),
  dateOrder: z.string(),
  dateSeparator: z.string(),
  decimalSeparator: z.string(),
  thousandsSeparator: z.string(),
  firstDayOfWeek: choice,
  language: z.string(),
  showLanguageInHeader: z.boolean(),
  symbol: z.string().trim().max(5, "errors.symbolTooLong"),
  position: z.string(),
  decimals: z.number(),
  negativeStyle: z.string(),
  idleTimeoutMinutes: z.number(),
  theme: z.string(),
});

export type FormFields = z.input<typeof schema>;
export type OverrideField =
  | "dateOrder"
  | "dateSeparator"
  | "decimalSeparator"
  | "thousandsSeparator"
  | "firstDayOfWeek";

const override = <T>(value: T | undefined) => value ?? COUNTRY_DEFAULT;
const fromOverride = <T>(value: unknown) =>
  value === COUNTRY_DEFAULT ? undefined : (value as T);

export const toForm = (prefs: IPreferences): FormFields => ({
  country: prefs.locale.country,
  dateOrder: override(prefs.locale.dateOrder),
  dateSeparator: override(prefs.locale.dateSeparator),
  decimalSeparator: override(prefs.locale.decimalSeparator),
  thousandsSeparator: override(prefs.locale.thousandsSeparator),
  firstDayOfWeek: override(prefs.locale.firstDayOfWeek),
  language: prefs.language ?? "",
  showLanguageInHeader: prefs.showLanguageInHeader,
  symbol: prefs.currency.symbol,
  position: prefs.currency.position,
  decimals: prefs.currency.decimals,
  negativeStyle: prefs.currency.negativeStyle,
  idleTimeoutMinutes: prefs.idleTimeoutMinutes,
  theme: prefs.theme,
});

// the preferences this form sets
export const fromForm = (
  values: FormFields
): Pick<
  IPreferences,
  | "locale"
  | "language"
  | "showLanguageInHeader"
  | "currency"
  | "idleTimeoutMinutes"
  | "theme"
> => ({
  locale: {
    country: values.country,
    dateOrder: fromOverride(values.dateOrder),
    dateSeparator: fromOverride(values.dateSeparator),
    decimalSeparator: fromOverride(values.decimalSeparator),
    thousandsSeparator: fromOverride(values.thousandsSeparator),
    firstDayOfWeek: fromOverride(values.firstDayOfWeek),
  },
  language: values.language || undefined,
  showLanguageInHeader: values.showLanguageInHeader,
  currency: {
    symbol: values.symbol.trim(),
    position: values.position as IPreferences["currency"]["position"],
    decimals: values.decimals as IPreferences["currency"]["decimals"],
    negativeStyle:
      values.negativeStyle as IPreferences["currency"]["negativeStyle"],
  },
  idleTimeoutMinutes: values.idleTimeoutMinutes,
  theme: values.theme as Theme,
});

export const separatorKey: Record<string, string> = {
  ".": "dot",
  ",": "comma",
  "/": "slash",
  "-": "dash",
  " ": "space",
  "'": "apostrophe",
  "": "none",
};
