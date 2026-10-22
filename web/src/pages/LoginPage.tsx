import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { AppState, TAppDispatch } from "store/store";
import "styles/login.scss";
import { AUTH_ERROR } from "store/auth/auth.slice";
import { useTranslation } from "react-i18next";
import LoginForm from "components/login/LoginForm";
import LocalLoginForm from "components/login/LocalLoginForm";
import AuthModeToggle from "components/login/AuthModeToggle";
import useAuthMode from "hooks/useAuthMode";

const LoginPage = () => {
  const dispatch = useDispatch<TAppDispatch>();
  const { t } = useTranslation();

  const { err } = useSelector((state: AppState) => state.auth);
  const [mode, setMode] = useAuthMode();

  useEffect(() => {
    dispatch(AUTH_ERROR(null));
  }, [dispatch, mode]);

  return (
    <div id="login-content">
      <h2>{t("login.header")}</h2>
      <AuthModeToggle mode={mode} onChange={setMode} />
      {err && <div className="error">{t(`errors.${err}`)}</div>}
      {mode === "local" ? <LocalLoginForm /> : <LoginForm />}
    </div>
  );
};

export default LoginPage;
