import React, { FC } from "react";
import DemoTopBar from "components/DemoTopBar";
import { useTranslation } from "react-i18next";
import { useSelector } from "react-redux";
import { Link, Outlet, useLocation } from "react-router-dom";
import { AppState } from "store/store";
import ErrorBoundary from "components/ErrorBoundary";

export interface ISideNavProps {}

const SideNavLayout: FC<ISideNavProps> = () => {
  const location = useLocation();

  const { t } = useTranslation();

  const { isDemo } = useSelector((state: AppState) => state.auth);

  return (
    <main>
      <div className="side-panel">
        <ul>
          <li>
            <Link
              to="/dashboard"
              className={`${
                location.pathname.startsWith("/dashboard") ? "selected" : ""
              }`}
            >
              {t("nav.dashboard")}
            </Link>
          </li>
          <li>
            <Link
              to="/planning/accounts"
              className={`${
                location.pathname.startsWith("/planning") ? "selected" : ""
              }`}
            >
              {t("nav.planning")}
            </Link>
          </li>
          <li>
            <Link
              to="/list"
              className={`${
                location.pathname.startsWith("/list") ? "selected" : ""
              }`}
            >
              {t("nav.statements")}
            </Link>
          </li>
          <li>
            <Link
              to="/budget"
              className={`${
                location.pathname.startsWith("/budget") ? "selected" : ""
              }`}
            >
              {t("nav.budget")}
            </Link>
          </li>
          <li>
            <Link
              to="/accounts"
              className={`${
                location.pathname.startsWith("/accounts") ? "selected" : ""
              }`}
            >
              {t("nav.accounts")}
            </Link>
          </li>
        </ul>
      </div>
      <div className="content">
        {isDemo && <DemoTopBar />}
        <ErrorBoundary>
          <Outlet />
        </ErrorBoundary>
      </div>
    </main>
  );
};

export default SideNavLayout;
