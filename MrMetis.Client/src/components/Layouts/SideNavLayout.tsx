import React from "react";
import DemoTopBar from "components/DemoTopBar";
import { useTranslation } from "react-i18next";
import { useSelector } from "react-redux";
import { Link, Outlet, useLocation } from "react-router-dom";
import { AppState } from "store/store";
import ErrorBoundary from "components/ErrorBoundary";

// `section` is the path prefix that marks the link as selected.
const navItems = [
  { to: "/dashboard", section: "/dashboard", labelKey: "nav.dashboard" },
  { to: "/planning/accounts", section: "/planning", labelKey: "nav.planning" },
  { to: "/list", section: "/list", labelKey: "nav.statements" },
  { to: "/budget", section: "/budget", labelKey: "nav.budget" },
  { to: "/accounts", section: "/accounts", labelKey: "nav.accounts" },
];

const SideNavLayout = () => {
  const location = useLocation();
  const { t } = useTranslation();
  const { isDemo } = useSelector((state: AppState) => state.auth);

  return (
    <main>
      <div className="side-panel">
        <ul>
          {navItems.map((item) => (
            <li key={item.to}>
              <Link
                to={item.to}
                className={
                  location.pathname.startsWith(item.section) ? "selected" : ""
                }
              >
                {t(item.labelKey)}
              </Link>
            </li>
          ))}
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
