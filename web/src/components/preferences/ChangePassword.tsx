import React, { useState } from "react";
import { useDispatch } from "react-redux";
import { useTranslation } from "react-i18next";
import { SubmitHandler } from "react-hook-form";
import { z } from "zod";
import { TAppDispatch } from "store/store";
import { changePassword } from "store/auth/auth.actions";
import { ADD_ERROR_TOAST, ADD_SUCCESS_TOAST } from "store/ui/ui.slice";
import { requiredError } from "helpers/zodHelper";
import useAppForm from "hooks/useAppForm";
import { CtaButton, TextInput } from "components/ui";

const schema = z
  .object({
    currentPassword: z
      .string(requiredError("errors.passwordEmpty"))
      .min(1, "errors.passwordEmpty"),
    newPassword: z
      .string(requiredError("errors.passwordEmpty"))
      .min(8, "errors.passwordTooShort"),
    newPasswordRepeat: z.string(),
  })
  // a forgotten password can't be reset, so make sure it was typed right
  .refine((input) => input.newPassword === input.newPasswordRepeat, {
    path: ["newPasswordRepeat"],
    message: "errors.passwordsDiffer",
  })
  .refine((input) => input.newPassword !== input.currentPassword, {
    path: ["newPassword"],
    message: "errors.passwordSame",
  });

type FormFields = z.infer<typeof schema>;

const defaults: FormFields = {
  currentPassword: "",
  newPassword: "",
  newPasswordRepeat: "",
};

// Changes the password of the account or on-device profile; the data stays as it is.
const ChangePassword = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch<TAppDispatch>();
  const [saving, setSaving] = useState(false);

  const {
    control,
    handleSubmit,
    reset,
    formState: { isValid },
  } = useAppForm(schema, defaults);

  const onSubmit: SubmitHandler<FormFields> = async ({
    currentPassword,
    newPassword,
  }) => {
    setSaving(true);
    const error = await dispatch(
      changePassword({ currentPassword, newPassword }),
    );
    setSaving(false);

    if (error) {
      dispatch(ADD_ERROR_TOAST(t(`errors.${error}`)));
      return;
    }
    reset(defaults);
    dispatch(ADD_SUCCESS_TOAST(t("preferences.passwordChanged")));
  };

  return (
    // a form of its own: gets the form styles, never saves the preferences
    <form className="change-password" onSubmit={handleSubmit(onSubmit)}>
      <h3>{t("preferences.changePassword")}</h3>
      <p>{t("preferences.changePasswordText")}</p>
      <TextInput
        name="currentPassword"
        control={control}
        type="password"
        label="preferences.currentPassword"
        autoComplete="current-password"
        required
        disabled={saving}
      />
      <TextInput
        name="newPassword"
        control={control}
        type="password"
        label="preferences.newPassword"
        autoComplete="new-password"
        required
        disabled={saving}
      />
      <TextInput
        name="newPasswordRepeat"
        control={control}
        type="password"
        label="preferences.newPasswordRepeat"
        autoComplete="new-password"
        required
        disabled={saving}
      />
      <div className="crud">
        <CtaButton
          disabled={!isValid}
          loading={saving}
          loadingLabel="preferences.changingPassword"
        >
          {t("preferences.changePasswordButton")}
        </CtaButton>
      </div>
    </form>
  );
};

export default ChangePassword;
