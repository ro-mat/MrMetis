import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { AppState, TAppDispatch } from "store/store";
import "styles/register.scss";
import { AUTH_ERROR } from "store/auth/auth.slice";
import { useTranslation } from "react-i18next";
import RegisterForm from "components/register/RegisterForm";
import LocalRegisterForm from "components/register/LocalRegisterForm";
import AuthModeToggle from "components/login/AuthModeToggle";
import useAuthMode from "hooks/useAuthMode";
import usePageMeta from "hooks/usePageMeta";

const RegisterPage = () => {
  const dispatch = useDispatch<TAppDispatch>();
  const { t } = useTranslation();

  const { err } = useSelector((state: AppState) => state.auth);
  const [mode, setMode] = useAuthMode();
  usePageMeta(t("register.header"), t("meta.register"));

  useEffect(() => {
    dispatch(AUTH_ERROR(null));
  }, [dispatch, mode]);

  return (
    <div id="register-content">
      <h2>{t("register.header")}</h2>
      <AuthModeToggle mode={mode} onChange={setMode} />
      {err && <div className="error">{t(`errors.${err}`)}</div>}
      {mode === "local" ? <LocalRegisterForm /> : <RegisterForm />}
    </div>
  );
};

export default RegisterPage;
