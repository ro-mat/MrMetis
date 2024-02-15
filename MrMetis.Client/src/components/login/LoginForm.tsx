import React from "react";
import { useDispatch, useSelector } from "react-redux";
import { login } from "store/auth/auth.actions";
import { ICredentials } from "store/auth/auth.types";
import { AppState, TAppDispatch } from "store/store";
import Labeled from "components/Labeled";
import "styles/login.scss";
import { useTranslation } from "react-i18next";
import { loginFormDefault } from "helpers/constants/defaults";
import { SubmitHandler, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const schema: z.ZodType<ICredentials> = z.object({
  email: z
    .string({ required_error: "errors.emailEmpty" })
    .email("errors.emailInvalid"),
  password: z
    .string({ required_error: "errors.passwordEmpty" })
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
      <Labeled
        labelKey="login.email"
        required
        errorKey={errors.email ? errors.email.message : undefined}
      >
        <input {...register("email")} type="text" disabled={isFetching} />
      </Labeled>
      <Labeled
        labelKey="login.password"
        required
        errorKey={errors.password ? errors.password.message : undefined}
      >
        <input
          {...register("password")}
          type="password"
          disabled={isFetching}
        />
      </Labeled>
      <button
        type="submit"
        className="btn primary"
        disabled={!isValid || isFetching}
      >
        {isFetching && t("login.loggingIn")}
        {!isFetching && t("login.login")}
      </button>
    </form>
  );
};

export default LoginForm;
