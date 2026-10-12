import React, { ReactNode, useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import { useWatch } from "react-hook-form";
import moment from "moment";
import debounce from "lodash/debounce";
import { TAppDispatch } from "store/store";
import { UPDATE_PREFERENCES } from "store/userdata/userdata.slice";
import { selectPreferences } from "store/userdata/userdata.selectors";
import { Checkbox, SelectBox, TextInput } from "components/ui";
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
import LocaleSelect from "./LocaleSelect";
import PreferencesPreview from "./PreferencesPreview";
import {
  FormFields,
  fromForm,
  IDLE_TIMEOUTS,
  LANGUAGES,
  schema,
  separatorKey,
  THEMES,
  toForm,
  WEEK_DAYS,
} from "./preferencesForm";

// Every change is applied and saved right away.
const PreferencesForm = ({ children }: { children?: ReactNode }) => {
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

  return (
    <div className="preferences-body">
      <div className="settings">
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
                  ...LANGUAGES.map((l) => ({
                    value: l,
                    label: l.toUpperCase(),
                  })),
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
                options={WEEK_DAYS.map((d) => ({
                  value: d,
                  label: weekdays[d],
                }))}
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
        {children}
      </div>
      <PreferencesPreview preview={preview} language={language} />
    </div>
  );
};

export default PreferencesForm;
