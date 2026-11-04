import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { SubmitHandler } from "react-hook-form";
import { z } from "zod";
import { AppState, TAppDispatch } from "store/store";
import { AUTH_ERROR } from "store/auth/auth.slice";
import { recover } from "store/auth/auth.actions";
import { parseRecoveryKey } from "services/encryptor";
import { requiredError } from "helpers/zodHelper";
import useAppForm from "hooks/useAppForm";
import usePageMeta from "hooks/usePageMeta";
import { CtaButton, TextInput } from "components/ui";
import "styles/login.scss";

const schema = z
  .object({
    email: z
      .string(requiredError("errors.emailEmpty"))
      .email("errors.emailInvalid"),
    recoveryKey: z
      .string(requiredError("errors.recoveryKeyEmpty"))
      .refine((key) => parseRecoveryKey(key) !== null, {
        message: "errors.recoveryKeyInvalid",
      }),
    newPassword: z
      .string(requiredError("errors.passwordEmpty"))
      .min(8, "errors.passwordTooShort"),
    newPasswordRepeat: z.string(),
  })
  // a forgotten password can't be reset again without the new recovery key,
  // so make sure it was typed right
  .refine((input) => input.newPassword === input.newPasswordRepeat, {
    path: ["newPasswordRepeat"],
    message: "errors.passwordsDiffer",
  });

type FormFields = z.infer<typeof schema>;

const defaults: FormFields = {
  email: "",
  recoveryKey: "",
  newPassword: "",
  newPasswordRepeat: "",
};

// Sets a new password with the recovery key. Once logged in, the new
// recovery key that replaces the used one is shown.
const RecoverPage = () => {
  const dispatch = useDispatch<TAppDispatch>();
  const { t } = useTranslation();
  const { err, isFetching } = useSelector((state: AppState) => state.auth);
  usePageMeta(t("recover.header"), t("meta.recover"));

  useEffect(() => {
    dispatch(AUTH_ERROR(null));
  }, [dispatch]);

  const {
    control,
    handleSubmit,
    formState: { isValid },
  } = useAppForm(schema, defaults);

  const onSubmit: SubmitHandler<FormFields> = ({
    email,
    recoveryKey,
    newPassword,
  }) => {
    dispatch(recover({ email, recoveryKey, newPassword }));
  };

  return (
    <div id="login-content">
      <h2>{t("recover.header")}</h2>
      <p className="note">{t("recover.note")}</p>
      {err && <div className="error">{t(`errors.${err}`)}</div>}
      <form onSubmit={handleSubmit(onSubmit)}>
        <TextInput
          name="email"
          control={control}
          label="login.email"
          autoComplete="username"
          required
          disabled={isFetching}
        />
        <TextInput
          name="recoveryKey"
          control={control}
          label="recover.recoveryKey"
          autoComplete="off"
          spellCheck={false}
          required
          disabled={isFetching}
        />
        <TextInput
          name="newPassword"
          control={control}
          type="password"
          label="preferences.newPassword"
          autoComplete="new-password"
          required
          disabled={isFetching}
        />
        <TextInput
          name="newPasswordRepeat"
          control={control}
          type="password"
          label="preferences.newPasswordRepeat"
          autoComplete="new-password"
          required
          disabled={isFetching}
        />
        <CtaButton
          size="normal"
          disabled={!isValid}
          loading={isFetching}
          loadingLabel="recover.recovering"
        >
          {t("recover.recover")}
        </CtaButton>
      </form>
      <p className="note">
        {t("recover.noKey")} <Link to="/login">{t("recover.backToLogin")}</Link>
      </p>
    </div>
  );
};

export default RecoverPage;
