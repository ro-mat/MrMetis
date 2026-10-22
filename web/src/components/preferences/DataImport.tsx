import React from "react";
import { useDispatch } from "react-redux";
import { useTranslation } from "react-i18next";
import { useWatch } from "react-hook-form";
import { z } from "zod";
import { TAppDispatch } from "store/store";
import { importData } from "store/userdata/userdata.actions";
import { ADD_ERROR_TOAST } from "store/ui/ui.slice";
import { Button, FileInput, RadioGroup, SelectBox } from "components/ui";
import useAppForm from "hooks/useAppForm";
import { IMPORTERS, ImportError } from "helpers/importers";
import { IMPORT_MODES } from "helpers/importHelper";

const schema = z.object({
  source: z.string(),
  mode: z.enum(IMPORT_MODES),
  file: z.instanceof(File),
});

// Adds the items of a file exported by the chosen app, or puts them in place
// of the current ones.
const DataImport = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch<TAppDispatch>();
  const { control, handleSubmit, resetField, validationErrors } = useAppForm(
    schema,
    { source: IMPORTERS[0].source, mode: "add" }
  );
  const source = useWatch({ control, name: "source" });
  const importer = IMPORTERS.find((i) => i.source === source)!;

  const handleImport = handleSubmit(async ({ file, mode }) => {
    try {
      const imported = importer.parse(await file.text());
      // preferences are always replaced, nothing to warn about
      if (
        mode === "overwrite" &&
        imported.entity !== "preferences" &&
        !window.confirm(
          t("preferences.importOverwriteConfirm", {
            entity: t(
              `preferences.exportEntities.${imported.entity}`
            ).toLocaleLowerCase(),
          })
        )
      ) {
        return;
      }
      dispatch(importData(imported, mode));
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
      <RadioGroup
        name="mode"
        control={control}
        label="preferences.importMode"
        options={IMPORT_MODES.map((m) => ({
          value: m,
          label: `preferences.importModes.${m}`,
        }))}
      />
      <div>
        <Button type="submit" disabled={validationErrors.length > 0}>
          {t("preferences.importButton")}
        </Button>
      </div>
    </form>
  );
};

export default DataImport;
