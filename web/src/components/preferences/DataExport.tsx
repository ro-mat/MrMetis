import React from "react";
import { useStore } from "react-redux";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import { AppState } from "store/store";
import { Button, SelectBox } from "components/ui";
import useAppForm from "hooks/useAppForm";
import {
  EXPORT_ENTITIES,
  EXPORT_FORMATS,
  exportData,
} from "helpers/exportHelper";

const schema = z.object({
  entity: z.enum(EXPORT_ENTITIES),
  format: z.enum(EXPORT_FORMATS),
});

// Downloads the chosen data.
const DataExport = () => {
  const { t } = useTranslation();
  // the data is read on export only, so changes don't re-render this
  const store = useStore<AppState>();
  const { control, handleSubmit } = useAppForm(schema, {
    entity: "statements",
    format: "csv",
  });

  const handleExport = handleSubmit(({ entity, format }) =>
    exportData(store.getState().data.userdata, entity, format)
  );

  return (
    // a form of its own: gets the form styles, never saves the preferences
    <form className="data-export" onSubmit={handleExport}>
      <h3>{t("preferences.export")}</h3>
      <div className="crud">
        <SelectBox
          name="entity"
          control={control}
          label="preferences.exportEntity"
          options={EXPORT_ENTITIES.map((en) => ({
            value: en,
            label: t(`preferences.exportEntities.${en}`),
          }))}
        />
        <SelectBox
          name="format"
          control={control}
          label="preferences.exportFormat"
          options={EXPORT_FORMATS.map((f) => ({
            value: f,
            label: f.toUpperCase(),
          }))}
        />
      </div>
      <div>
        <Button type="submit">{t("preferences.exportButton")}</Button>
      </div>
    </form>
  );
};

export default DataExport;
