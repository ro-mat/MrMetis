import React from "react";
import ErrorBoundary from "components/ErrorBoundary";
import { useTranslation } from "react-i18next";
import { Link, Outlet, useLocation } from "react-router-dom";

const Planning = () => {
  const { t } = useTranslation();
  const location = useLocation();

  return (
    <>
      <h2>{t("planning.header")}</h2>
      <div id="planning-subnav">
        <Link
          to="/planning/all"
          className={`btn small ${
            location.pathname.startsWith("/planning/all")
              ? "primary"
              : "secondary"
          }`}
        >
          {t("planning.all")}
        </Link>
        <Link
          to="/planning/accounts"
          className={`btn small  ${
            location.pathname.startsWith("/planning/accounts")
              ? "primary"
              : "secondary"
          }`}
        >
          {t("planning.perAccount")}
        </Link>
      </div>
      <ErrorBoundary>
        <Outlet />
      </ErrorBoundary>
    </>
  );
};

export default Planning;
