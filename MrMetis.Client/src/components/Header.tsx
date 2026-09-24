import React, { useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, useNavigate } from "react-router-dom";
import { logout } from "store/auth/auth.actions";
import { AppState, TAppDispatch } from "store/store";
import QuickAdd from "./quick-add/QuickAdd";
import { useTranslation } from "react-i18next";
import Logo from "styles/img/logo.png";
import moment from "moment";

const Header = (): JSX.Element => {
  const dispatch = useDispatch<TAppDispatch>();
  const { t, i18n } = useTranslation();
  moment.locale(i18n.language);

  const navigate = useNavigate();

  const { token, user, isDemo } = useSelector((state: AppState) => state.auth);

  const authenticated = useMemo(() => !!token && !!user, [token, user]);

  const changeLang = (lang: string) => {
    i18n.changeLanguage(lang);
    moment.updateLocale(i18n.language, {});
  };

  const onLogoutClick = () => {
    dispatch(logout());
    navigate("/");
  };

  return (
    <header>
      <div className="left">
        <div>
          <Link to="/">
            <img src={Logo} alt="Mr metis logo" className="logo" />
          </Link>
        </div>
        <div>{(authenticated || isDemo) && <QuickAdd />}</div>
      </div>
      <div className="right">
        <div className="lang-select">
          {["en", "ru"].map((l) => (
            <button
              key={l}
              onClick={() => changeLang(l)}
              className={`${i18n.language === l ? "selected" : ""}`}
            >
              {l}
            </button>
          ))}
        </div>
        {authenticated && (
          <div className="dropdown">
            <Link to="/dashboard">{t("nav.dashboard")}</Link>|
            <button onClick={onLogoutClick} className="btn small secondary">
              {t("nav.logout")}
            </button>
          </div>
        )}
        {!authenticated && (
          <div>
            <Link to="/login">{t("nav.login")}</Link>|
            <Link to="/register">{t("nav.register")}</Link>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
