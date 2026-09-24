import React from "react";
import { useDispatch, useSelector } from "react-redux";
import { register as registerUser } from "store/auth/auth.actions";
import { ICredentials } from "store/auth/auth.types";
import { AppState, TAppDispatch } from "store/store";
import { CtaButton, TextInput } from "components/ui";
import "styles/register.scss";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import { requiredError } from "helpers/zodHelper";
import { SubmitHandler } from "react-hook-form";
import useAppForm from "hooks/useAppForm";
import { registerFormDefault } from "helpers/constants/defaults";

const schema: z.ZodType<ICredentials, ICredentials> = z.object({
  email: z
    .string(requiredError("errors.emailEmpty"))
    .email("errors.emailInvalid"),
  password: z
    .string(requiredError("errors.passwordEmpty"))
    .min(8, "errors.passwordTooShort"),
  invitationCode: z.string(requiredError("errors.codeEmpty")),
});

type FormFields = z.infer<typeof schema>;

const RegisterForm = () => {
  const dispatch = useDispatch<TAppDispatch>();
  const { t } = useTranslation();

  const { isFetching } = useSelector((state: AppState) => state.auth);

  const {
    control,
    handleSubmit,
    formState: { isValid },
  } = useAppForm(schema, registerFormDefault);

  const onSubmit: SubmitHandler<FormFields> = async (data) => {
    dispatch(registerUser(data));
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <TextInput
        name="email"
        control={control}
        label="register.email"
        required
        disabled={isFetching}
      />
      <TextInput
        name="password"
        control={control}
        type="password"
        label="register.password"
        required
        disabled={isFetching}
      />
      <TextInput
        name="invitationCode"
        control={control}
        label="register.code"
        required
        disabled={isFetching}
      />
      <CtaButton
        size="normal"
        disabled={!isValid}
        loading={isFetching}
        loadingLabel="register.registering"
      >
        {t("register.register")}
      </CtaButton>
    </form>
  );
};

export default RegisterForm;
