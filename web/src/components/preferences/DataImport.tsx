import React from "react";
import { useDispatch } from "react-redux";
import { useTranslation } from "react-i18next";
import { useWatch } from "react-hook-form";
import { z } from "zod";
import { TAppDispatch } from "store/store";
import { importData } from "store/userdata/userdata.actions";
import { ADD_ERROR_TOAST } from "store/ui/ui.slice";
import { Button, FileInput, SelectBox } from "components/ui";
import useAppForm from "hooks/useAppForm";
import { IMPORTERS, ImportError } from "helpers/importers";

const schema = z.object({
  source: z.string(),
  file: z.instanceof(File),
});

// Adds the items of a file exported by the chosen app.
const DataImport = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch<TAppDispatch>();
  const { control, handleSubmit, resetField, validationErrors } = useAppForm(
    schema,
    { source: IMPORTERS[0].source }
  );
  const source = useWatch({ control, name: "source" });
  const importer = IMPORTERS.find((i) => i.source === source)!;

  const handleImport = handleSubmit(async ({ file }) => {
    try {
      dispatch(importData(importer.parse(await file.text())));
    } catch (err) {
      dispatch(
        ADD_ERROR_TOAST(
          t(
            err instanceof ImportError
              ? err.message
              : "preferences.importInvalid"
          )
        )
      );
    }
    resetField("file");
  });

  return (
    <form className="data-import" onSubmit={handleImport}>
      <h3>{t("preferences.import")}</h3>
      <div className="crud">
        <SelectBox
          name="source"
          control={control}
          label="preferences.importSource"
          options={IMPORTERS.map((i) => ({ value: i.source, label: i.label }))}
        />
        <FileInput
          name="file"
          control={control}
          label="preferences.importFile"
          accept={importer.accept}
        />
      </div>
      <div>
        <Button type="submit" disabled={validationErrors.length > 0}>
          {t("preferences.importButton")}
        </Button>
      </div>
    </form>
  );
};

export default DataImport;
