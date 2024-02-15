import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { AppState, TAppDispatch } from "store/store";
import "styles/register.scss";
import { AUTH_ERROR } from "store/auth/auth.slice";
import { useTranslation } from "react-i18next";
import RegisterForm from "components/register/RegisterForm";

const RegisterPage = () => {
  const dispatch = useDispatch<TAppDispatch>();
  const { t } = useTranslation();

  const { err } = useSelector((state: AppState) => state.auth);

  useEffect(() => {
    dispatch(AUTH_ERROR(null));
  }, [dispatch]);

  return (
    <div id="register-content">
      <h2>Register</h2>
      {err && <div className="error">{t(`errors.${err}`)}</div>}
      <RegisterForm />
    </div>
  );
};

export default RegisterPage;
