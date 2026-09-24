import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { AppState, TAppDispatch } from "store/store";
import "styles/login.scss";
import { AUTH_ERROR } from "store/auth/auth.slice";
import { useTranslation } from "react-i18next";
import LoginForm from "components/login/LoginForm";

const LoginPage = () => {
  const dispatch = useDispatch<TAppDispatch>();
  const { t } = useTranslation();

  const { err } = useSelector((state: AppState) => state.auth);

  useEffect(() => {
    dispatch(AUTH_ERROR(null));
  }, [dispatch]);

  return (
    <div id="login-content">
      <h2>{t("login.header")}</h2>
      {err && <div className="error">{t(`errors.${err}`)}</div>}
      <LoginForm />
    </div>
  );
};

export default LoginPage;
