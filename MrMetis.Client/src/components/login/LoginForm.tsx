import React from "react";
import { useDispatch, useSelector } from "react-redux";
import { login } from "store/auth/auth.actions";
import { ICredentials } from "store/auth/auth.types";
import { AppState, TAppDispatch } from "store/store";
import { CtaButton, TextInput } from "components/ui";
import "styles/login.scss";
import { useTranslation } from "react-i18next";
import { loginFormDefault } from "helpers/constants/defaults";
import { SubmitHandler, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { requiredError } from "helpers/zodHelper";

const schema: z.ZodType<ICredentials, ICredentials> = z.object({
  email: z
    .string(requiredError("errors.emailEmpty"))
    .email("errors.emailInvalid"),
  password: z
    .string(requiredError("errors.passwordEmpty"))
    .min(8, "errors.passwordTooShort"),
});

type FormFields = z.infer<typeof schema>;

const LoginForm = () => {
  const dispatch = useDispatch<TAppDispatch>();
  const { t } = useTranslation();

  const { isFetching } = useSelector((state: AppState) => state.auth);

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
  } = useForm<FormFields>({
    defaultValues: loginFormDefault,
    resolver: zodResolver(schema),
    mode: "onTouched",
  });

  const onSubmit: SubmitHandler<FormFields> = async (data) => {
    dispatch(login(data));
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <TextInput
        {...register("email")}
        label="login.email"
        required
        error={errors.email?.message}
        disabled={isFetching}
      />
      <TextInput
        {...register("password")}
        type="password"
        label="login.password"
        required
        error={errors.password?.message}
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
    </form>
  );
};

export default LoginForm;
