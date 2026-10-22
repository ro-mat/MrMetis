import React from "react";
import { useDispatch, useSelector } from "react-redux";
import { localRegister } from "store/auth/auth.actions";
import { AppState, TAppDispatch } from "store/store";
import { CtaButton, TextInput } from "components/ui";
import "styles/register.scss";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import { requiredError, requiredText } from "helpers/zodHelper";
import { SubmitHandler } from "react-hook-form";
import useAppForm from "hooks/useAppForm";
import { localRegisterFormDefault } from "helpers/constants/defaults";

const schema = z
  .object({
    name: requiredText("errors.nameEmpty"),
    password: z
      .string(requiredError("errors.passwordEmpty"))
      .min(8, "errors.passwordTooShort"),
    passwordRepeat: z.string(),
  })
  // a forgotten password can't be reset here, so make sure it was typed right
  .refine((input) => input.password === input.passwordRepeat, {
    path: ["passwordRepeat"],
    message: "errors.passwordsDiffer",
  });

type FormFields = z.infer<typeof schema>;

// Creates a profile stored only in this browser; nothing is sent to the server.
const LocalRegisterForm = () => {
  const dispatch = useDispatch<TAppDispatch>();
  const { t } = useTranslation();

  const { isFetching } = useSelector((state: AppState) => state.auth);

  const {
    control,
    handleSubmit,
    formState: { isValid },
  } = useAppForm(schema, localRegisterFormDefault);

  const onSubmit: SubmitHandler<FormFields> = async ({ name, password }) => {
    dispatch(localRegister({ name, password }));
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <p className="note">{t("register.localNote")}</p>
      <TextInput
        name="name"
        control={control}
        label="register.profile"
        autoComplete="off"
        required
        disabled={isFetching}
      />
      <TextInput
        name="password"
        control={control}
        type="password"
        label="register.password"
        autoComplete="new-password"
        required
        disabled={isFetching}
      />
      <TextInput
        name="passwordRepeat"
        control={control}
        type="password"
        label="register.passwordRepeat"
        autoComplete="new-password"
        required
        disabled={isFetching}
      />
      <CtaButton
        size="normal"
        disabled={!isValid}
        loading={isFetching}
        loadingLabel="register.registering"
      >
        {t("register.createProfile")}
      </CtaButton>
    </form>
  );
};

export default LocalRegisterForm;
