import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { localLogin } from "store/auth/auth.actions";
import { ILocalCredentials } from "store/auth/auth.types";
import { AppState, TAppDispatch } from "store/store";
import { CtaButton, TextInput } from "components/ui";
import "styles/login.scss";
import { useTranslation } from "react-i18next";
import { localLoginFormDefault } from "helpers/constants/defaults";
import { SubmitHandler } from "react-hook-form";
import useAppForm from "hooks/useAppForm";
import { z } from "zod";
import { requiredError, requiredText } from "helpers/zodHelper";
import { listLocalUsers } from "services/localUsers";

const schema: z.ZodType<ILocalCredentials, ILocalCredentials> = z.object({
  name: requiredText("errors.nameEmpty"),
  password: z
    .string(requiredError("errors.passwordEmpty"))
    .min(8, "errors.passwordTooShort"),
});

type FormFields = z.infer<typeof schema>;

// Opens a profile stored in this browser; nothing is sent to the server.
const LocalLoginForm = () => {
  const dispatch = useDispatch<TAppDispatch>();
  const { t } = useTranslation();

  const { isFetching } = useSelector((state: AppState) => state.auth);
  const [profiles, setProfiles] = useState<string[]>([]);

  const {
    control,
    handleSubmit,
    setValue,
    formState: { isValid },
  } = useAppForm(schema, localLoginFormDefault);

  useEffect(() => {
    listLocalUsers()
      .then((names) => {
        setProfiles(names);
        // with a single profile there is nothing to choose
        if (names.length === 1) {
          setValue("name", names[0], { shouldValidate: true });
        }
      })
      .catch(() => setProfiles([]));
  }, [setValue]);

  const onSubmit: SubmitHandler<FormFields> = async (data) => {
    dispatch(localLogin(data));
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <TextInput
        name="name"
        control={control}
        label="login.profile"
        list="local-profiles"
        autoComplete="off"
        required
        disabled={isFetching}
      />
      <datalist id="local-profiles">
        {profiles.map((p) => (
          <option key={p} value={p} />
        ))}
      </datalist>
      <TextInput
        name="password"
        control={control}
        type="password"
        label="login.password"
        required
        disabled={isFetching}
      />
      <CtaButton
        size="normal"
        disabled={!isValid}
        loading={isFetching}
        loadingLabel="login.loggingIn"
      >
        {t("login.login")}
      </CtaButton>
      {!profiles.length && <p className="note">{t("login.noProfiles")}</p>}
    </form>
  );
};

export default LocalLoginForm;
