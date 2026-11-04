import React, { useCallback, useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import { useTranslation } from "react-i18next";
import { SubmitHandler } from "react-hook-form";
import { z } from "zod";
import { TAppDispatch } from "store/store";
import { getRecoveryStatus, setRecoveryKey } from "store/auth/auth.actions";
import { ADD_ERROR_TOAST } from "store/ui/ui.slice";
import { requiredError } from "helpers/zodHelper";
import useAppForm from "hooks/useAppForm";
import useLocale from "hooks/useLocale";
import { CtaButton, TextInput } from "components/ui";

const schema = z.object({
  currentPassword: z
    .string(requiredError("errors.passwordEmpty"))
    .min(1, "errors.passwordEmpty"),
});

type FormFields = z.infer<typeof schema>;

const defaults: FormFields = { currentPassword: "" };

// Creates or replaces the account's recovery key, shown by RecoveryKeyDialog.
const RecoveryKey = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch<TAppDispatch>();
  const { formatDate } = useLocale();
  // undefined while loading or when it couldn't be loaded
  const [created, setCreated] = useState<string | null>();
  const [saving, setSaving] = useState(false);

  const {
    control,
    handleSubmit,
    reset,
    formState: { isValid },
  } = useAppForm(schema, defaults);

  const loadStatus = useCallback(
    () =>
      getRecoveryStatus()
        .then((status) => setCreated(status.created))
        .catch(() => setCreated(undefined)),
    [],
  );
  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  const onSubmit: SubmitHandler<FormFields> = async ({ currentPassword }) => {
    if (created && !window.confirm(t("preferences.replaceRecoveryConfirm"))) {
      return;
    }

    setSaving(true);
    const error = await dispatch(setRecoveryKey(currentPassword));
    setSaving(false);

    if (error) {
      dispatch(ADD_ERROR_TOAST(t(`errors.${error}`)));
      return;
    }
    reset(defaults);
    loadStatus();
  };

  return (
    // a form of its own: gets the form styles, never saves the preferences
    <form className="recovery-key-form" onSubmit={handleSubmit(onSubmit)}>
      <h3>{t("preferences.recoveryKey")}</h3>
      <p>{t("preferences.recoveryKeyText")}</p>
      {created !== undefined && (
        <p>
          {created
            ? t("preferences.recoveryKeyCreated", {
                date: formatDate(created),
              })
            : t("preferences.recoveryKeyNone")}
        </p>
      )}
      <TextInput
        name="currentPassword"
        control={control}
        type="password"
        label="preferences.currentPassword"
        autoComplete="current-password"
        required
        disabled={saving}
      />
      <div className="crud">
        <CtaButton
          disabled={!isValid}
          loading={saving}
          loadingLabel="preferences.creatingRecoveryKey"
        >
          {t(
            created
              ? "preferences.replaceRecoveryKey"
              : "preferences.createRecoveryKey",
          )}
        </CtaButton>
      </div>
    </form>
  );
};

export default RecoveryKey;
