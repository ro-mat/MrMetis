import React from "react";
import { useDispatch, useSelector } from "react-redux";
import { register as registerUser } from "store/auth/auth.actions";
import { ICredentials } from "store/auth/auth.types";
import { AppState, TAppDispatch } from "store/store";
import Labeled from "components/Labeled";
import "styles/register.scss";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import { SubmitHandler, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { registerFormDefault } from "helpers/constants/defaults";

const schema: z.ZodType<ICredentials> = z.object({
  email: z
    .string({ required_error: "errors.emailEmpty" })
    .email("errors.emailInvalid"),
  password: z
    .string({ required_error: "errors.passwordEmpty" })
    .min(8, "errors.passwordTooShort"),
  invitationCode: z.string({ required_error: "errors.codeEmpty" }),
});

type FormFields = z.infer<typeof schema>;

const RegisterForm = () => {
  const dispatch = useDispatch<TAppDispatch>();
  const { t } = useTranslation();

  const { isFetching } = useSelector((state: AppState) => state.auth);

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
  } = useForm<FormFields>({
    defaultValues: registerFormDefault,
    resolver: zodResolver(schema),
    mode: "onTouched",
  });

  const onSubmit: SubmitHandler<FormFields> = async (data) => {
    dispatch(registerUser(data));
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Labeled
        labelKey="register.email"
        required
        errorKey={errors.email?.message}
      >
        <input {...register("email")} type="text" disabled={isFetching} />
      </Labeled>
      <Labeled
        labelKey="register.password"
        required
        errorKey={errors.password?.message}
      >
        <input
          {...register("password")}
          type="password"
          disabled={isFetching}
        />
      </Labeled>
      <Labeled
        labelKey="register.code"
        required
        errorKey={errors.invitationCode?.message}
      >
        <input
          {...register("invitationCode")}
          type="text"
          disabled={isFetching}
        />
      </Labeled>
      <button
        type="submit"
        className="btn primary"
        disabled={!isValid || isFetching}
      >
        {isFetching && t("register.registering")}
        {!isFetching && t("register.register")}
      </button>
    </form>
  );
};

export default RegisterForm;
