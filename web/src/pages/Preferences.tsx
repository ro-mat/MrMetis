import React, { useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import { Control, Controller, useWatch } from "react-hook-form";
import { z } from "zod";
import moment from "moment";
import debounce from "lodash/debounce";
import { AppState, TAppDispatch } from "store/store";
import { UPDATE_PREFERENCES } from "store/userdata/userdata.slice";
import { selectPreferences } from "store/userdata/userdata.selectors";
import { IPreferences, Theme } from "store/userdata/userdata.types";
import {
  Checkbox,
  ISelectOption,
  PageHeader,
  SelectBox,
  TextInput,
} from "components/ui";
import useAppForm from "hooks/useAppForm";
import {
  createFormatter,
  DATE_ORDERS,
  DATE_SEPARATORS,
  DECIMAL_SEPARATORS,
  getCountryOptions,
  getCountryPreset,
  THOUSANDS_SEPARATORS,
} from "helpers/localeHelper";

// form value of "use the country's value" ("" is a real choice: no separator)
const COUNTRY_DEFAULT = "default";

const LANGUAGES = ["en", "ru"];
const IDLE_TIMEOUTS = [5, 10, 15, 30, 60];
const THEMES: Theme[] = ["auto", "light", "dark"];
const WEEK_DAYS = [1, 2, 3, 4, 5, 6, 0];

const choice = z.union([z.string(), z.number()]);
const schema = z.object({
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

type FormFields = z.input<typeof schema>;
type OverrideField =
  | "dateOrder"
  | "dateSeparator"
  | "decimalSeparator"
  | "thousandsSeparator"
  | "firstDayOfWeek";

interface ILocaleSelectProps {
  name: OverrideField;
  control: Control<FormFields, unknown, z.output<typeof schema>>;
  label: string;
  options: ISelectOption[];
  // the country's value
  preset: string | number;
}

// The country's value is marked as the default; picking it follows the
// country again (also after changing the country).
const LocaleSelect = ({
  name,
  control,
  label,
  options,
  preset,
}: ILocaleSelectProps) => {
  const { t } = useTranslation();
  const marked = options.map((o) =>
    o.value === preset
      ? { ...o, label: `${o.label} — ${t("preferences.default")}` }
      : o
  );

  return (
    <Controller
      name={name}
      control={control}
      render={({ field }) => (
        <SelectBox
          label={label}
          options={marked}
          name={field.name}
          onBlur={field.onBlur}
          value={String(field.value === COUNTRY_DEFAULT ? preset : field.value)}
          onChange={(e) => {
            const picked = options.find(
              (o) => String(o.value) === e.currentTarget.value
            )?.value;
            field.onChange(picked === preset ? COUNTRY_DEFAULT : picked);
          }}
        />
      )}
    />
  );
};

const override = <T,>(value: T | undefined) => value ?? COUNTRY_DEFAULT;
const fromOverride = <T,>(value: unknown) =>
  value === COUNTRY_DEFAULT ? undefined : (value as T);

const toForm = (prefs: IPreferences): FormFields => ({
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
const fromForm = (
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

const separatorKey: Record<string, string> = {
  ".": "dot",
  ",": "comma",
  "/": "slash",
  "-": "dash",
  " ": "space",
  "'": "apostrophe",
  "": "none",
};

// Every change is applied and saved right away.
const PreferencesForm = () => {
  const { t, i18n } = useTranslation();
  const dispatch = useDispatch<TAppDispatch>();
  const prefs = useSelector(selectPreferences);
  const language = i18n.resolvedLanguage ?? i18n.language;

  const { control, reset, getValues, watch } = useAppForm(
    schema,
    toForm(prefs)
  );
  const values = useWatch({ control }) as FormFields;

  // e.g. the data loaded after the page, or the language was switched in the header
  useEffect(() => {
    const stored = toForm(prefs);
    if (JSON.stringify(stored) !== JSON.stringify(getValues())) {
      reset(stored);
    }
  }, [prefs, reset, getValues]);

  // typing the symbol shouldn't save on every key
  const save = useMemo(
    () =>
      debounce(
        (values: FormFields) => dispatch(UPDATE_PREFERENCES(fromForm(values))),
        400
      ),
    [dispatch]
  );
  useEffect(
    () => () => {
      save.flush();
    },
    [save]
  );

  // Only the user's own changes are saved. Comparing the form with the store
  // instead would also "save" a form not yet reset to newly loaded data, and
  // the store and the form would keep overwriting each other.
  useEffect(() => {
    const subscription = watch((changed, { type }) => {
      if (type === "change" && schema.safeParse(changed).success) {
        save(changed as FormFields);
      }
    });
    return () => subscription.unsubscribe();
  }, [watch, save]);

  const preview = useMemo(
    () =>
      schema.safeParse(values).success
        ? createFormatter({ ...prefs, ...fromForm(values) })
        : createFormatter(prefs),
    [values, prefs]
  );

  const preset = getCountryPreset(values.country ?? prefs.locale.country);
  const countryOptions = useMemo(() => getCountryOptions(language), [language]);
  const weekdays = moment.localeData(language).weekdays();

  const separatorLabel = (s: string) =>
    `${t(`preferences.separator.${separatorKey[s]}`)}${s.trim() ? ` (${s})` : ""}`;
  const separatorOptions = (list: string[]) =>
    list.map((s) => ({ value: s, label: separatorLabel(s) }));
  const dateOrderLabel = (o: string) => t(`preferences.dateOrder.${o}`);

  const week = WEEK_DAYS.map(
    (_, i) => (preview.locale.firstDayOfWeek + i) % 7
  ).map((d) => moment.localeData(language).weekdaysMin()[d]);

  return (
    <div className="preferences-body">
      <form onSubmit={(e) => e.preventDefault()}>
        <section>
          <h3>{t("preferences.general")}</h3>
          <div className="crud">
            <SelectBox
              name="language"
              control={control}
              label="preferences.language"
              options={[
                { value: "", label: t("preferences.browserLanguage") },
                ...LANGUAGES.map((l) => ({ value: l, label: l.toUpperCase() })),
              ]}
            />
            {/* label on top, like the fields next to it */}
            <Checkbox
              name="showLanguageInHeader"
              control={control}
              horizontal={false}
              wrapLabel
              label="preferences.showLanguageInHeader"
            />
            <SelectBox
              name="idleTimeoutMinutes"
              control={control}
              label="preferences.idleTimeout"
              options={IDLE_TIMEOUTS.map((m) => ({
                value: m,
                label: t("preferences.minutes", { count: m }),
              }))}
            />
            {/* saved only; the dark styles come later */}
            <SelectBox
              name="theme"
              control={control}
              label="preferences.theme"
              options={THEMES.map((th) => ({
                value: th,
                label: t(`preferences.themes.${th}`),
              }))}
            />
          </div>
        </section>

        <section>
          <h3>{t("preferences.locale")}</h3>
          <SelectBox
            name="country"
            control={control}
            filterable
            label="preferences.country"
            options={countryOptions}
          />
          <div className="crud">
            <LocaleSelect
              name="dateOrder"
              control={control}
              label="preferences.dateFormat"
              options={DATE_ORDERS.map((o) => ({
                value: o,
                label: dateOrderLabel(o),
              }))}
              preset={preset.dateOrder}
            />
            <LocaleSelect
              name="dateSeparator"
              control={control}
              label="preferences.dateSeparator"
              options={separatorOptions(DATE_SEPARATORS)}
              preset={preset.dateSeparator}
            />
            <LocaleSelect
              name="firstDayOfWeek"
              control={control}
              label="preferences.firstDayOfWeek"
              options={WEEK_DAYS.map((d) => ({ value: d, label: weekdays[d] }))}
              preset={preset.firstDayOfWeek}
            />
          </div>
          <div className="crud">
            <LocaleSelect
              name="decimalSeparator"
              control={control}
              label="preferences.decimalSeparator"
              options={separatorOptions(DECIMAL_SEPARATORS)}
              preset={preset.decimalSeparator}
            />
            <LocaleSelect
              name="thousandsSeparator"
              control={control}
              label="preferences.thousandsSeparator"
              options={separatorOptions(THOUSANDS_SEPARATORS)}
              preset={preset.thousandsSeparator}
            />
          </div>
        </section>

        <section>
          <h3>{t("preferences.currency")}</h3>
          <div className="crud">
            <TextInput
              name="symbol"
              control={control}
              className="symbol"
              label="preferences.symbol"
              placeholder="€, $, ₽"
            />
            <SelectBox
              name="position"
              control={control}
              label="preferences.position"
              options={["before", "after"].map((p) => ({
                value: p,
                label: t(`preferences.positions.${p}`),
              }))}
            />
            <SelectBox
              name="decimals"
              control={control}
              label="preferences.decimals"
              options={[2, 0].map((d) => ({ value: d, label: String(d) }))}
            />
            <SelectBox
              name="negativeStyle"
              control={control}
              label="preferences.negativeStyle"
              options={[
                { value: "minus", label: "-1" },
                { value: "parentheses", label: "(1)" },
              ]}
            />
          </div>
        </section>
      </form>
      {/* apart from the settings, so it stays in view while changing them */}
      <aside className="preview-panel">
        <h3>{t("preferences.preview")}</h3>
        <dl className="preview">
          <dt>{t("preferences.previewDate")}</dt>
          <dd>{preview.formatDate(moment())}</dd>
          <dt>{t("preferences.previewMonth")}</dt>
          <dd>{preview.formatMonth(moment())}</dd>
          <dt>{t("preferences.previewAmount")}</dt>
          <dd>{preview.formatAmount(1234567.891)}</dd>
          <dt>{t("preferences.previewNegative")}</dt>
          <dd>{preview.formatAmount(-1234.5)}</dd>
          <dt>{t("preferences.previewWeek")}</dt>
          <dd className="week">
            {week.map((d) => (
              <span key={d}>{d}</span>
            ))}
          </dd>
        </dl>
      </aside>
    </div>
  );
};

// The form waits for the stored preferences, so it doesn't show the defaults
// (e.g. the browser's country) first.
const Preferences = () => {
  const { loaded } = useSelector((state: AppState) => state.data);

  return (
    <div className="preferences">
      <PageHeader title="preferences.header" />
      {loaded && <PreferencesForm />}
    </div>
  );
};

export default Preferences;
