import React from "react";
import { useTranslation } from "react-i18next";
import moment from "moment";
import { createFormatter } from "helpers/localeHelper";
import { WEEK_DAYS } from "./preferencesForm";

interface IPreferencesPreviewProps {
  preview: ReturnType<typeof createFormatter>;
  language: string;
}

// Shows how dates and amounts look with the preferences being edited.
const PreferencesPreview = ({
  preview,
  language,
}: IPreferencesPreviewProps) => {
  const { t } = useTranslation();
  const week = WEEK_DAYS.map(
    (_, i) => (preview.locale.firstDayOfWeek + i) % 7
  ).map((d) => moment.localeData(language).weekdaysMin()[d]);

  return (
    // apart from the settings, so it stays in view while changing them
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
  );
};

export default PreferencesPreview;
