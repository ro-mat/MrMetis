import React, { useEffect } from "react";
import { Formik } from "formik";
import { useDispatch, useSelector } from "react-redux";
import { register } from "store/auth/auth.actions";
import { ICredentials } from "store/auth/auth.types";
import { AppState, TAppDispatch } from "store/store";
import Labeled from "components/Labeled";
import "styles/register.scss";
import { AUTH_ERROR } from "store/auth/auth.slice";
import { useTranslation } from "react-i18next";

const Register = () => {
  const dispatch = useDispatch<TAppDispatch>();
  const { t } = useTranslation();

  const { isFetching, err } = useSelector((state: AppState) => state.auth);

  function defaultForm(): ICredentials {
    return {
      email: "",
      password: "",
      invitationCode: "",
    };
  }

  useEffect(() => {
    dispatch(AUTH_ERROR(null));
  }, [dispatch]);

  return (
    <div id="register-content">
      <h2>Register</h2>
      {err && <div className="error">{t(`errors.${err}`)}</div>}
      <Formik
        validateOnChange={true}
        validateOnBlur={true}
        initialValues={defaultForm()}
        validate={(values) => {
          const errors: ICredentials = {};

          if (!values.email) {
            errors.email = "errors.emailEmpty";
          } else if (
            !/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,4}$/i.test(values.email)
          ) {
            errors.email = "errors.emailInvalid";
          }
          if (!values.password) {
            errors.password = "errors.passwordEmpty";
          } else if (values.password.length < 8) {
            errors.password = "errors.passwordInvalid";
          }
          if (!values.invitationCode) {
            errors.invitationCode = "errors.codeEmpty";
          }
          return errors;
        }}
        onSubmit={async (values) => {
          dispatch(register(values));
        }}
      >
        {({
          values,
          isValid,
          errors,
          touched,
          handleSubmit,
          handleChange,
          handleBlur,
        }) => (
          <form onSubmit={handleSubmit}>
            <Labeled
              labelKey="register.email"
              required
              errorKey={
                touched.email && errors.email ? errors.email : undefined
              }
            >
              <input
                type="text"
                name="email"
                id="email"
                value={values.email}
                onChange={handleChange}
                onBlur={handleBlur}
                disabled={isFetching}
              />
            </Labeled>
            <Labeled
              labelKey="register.password"
              required
              errorKey={
                touched.password && errors.password
                  ? errors.password
                  : undefined
              }
            >
              <input
                type="password"
                name="password"
                id="password"
                value={values.password}
                onChange={handleChange}
                onBlur={handleBlur}
                disabled={isFetching}
              />
            </Labeled>
            <Labeled
              labelKey="register.code"
              required
              errorKey={
                touched.invitationCode && errors.invitationCode
                  ? errors.invitationCode
                  : undefined
              }
            >
              <input
                type="text"
                name="invitationCode"
                id="invitationCode"
                value={values.invitationCode}
                onChange={handleChange}
                onBlur={handleBlur}
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
        )}
      </Formik>
    </div>
  );
};

export default Register;
