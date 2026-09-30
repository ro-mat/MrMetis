import React from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faChevronDown,
  faCircleExclamation,
  faCircleUser,
} from "@fortawesome/free-solid-svg-icons";
import { logout } from "store/auth/auth.actions";
import { AppState, TAppDispatch } from "store/store";
import { selectIsAuthenticated } from "store/auth/auth.selectors";
import {
  selectStorage,
  selectStorageWarning,
} from "store/userdata/userdata.selectors";
import { formatBytes } from "helpers/numberHelper";
import QuickAdd from "./quick-add/QuickAdd";
import { IMenuItem, Menu } from "./ui";
import { useTranslation } from "react-i18next";
import Logo from "styles/img/logo.png";
import moment from "moment";

const languages = ["en", "ru"];

const Header = (): React.JSX.Element => {
  const dispatch = useDispatch<TAppDispatch>();
  const { t, i18n } = useTranslation();
  moment.locale(i18n.language);

  const navigate = useNavigate();

  const { isDemo } = useSelector((state: AppState) => state.auth);
  const authenticated = useSelector(selectIsAuthenticated);
  const storage = useSelector(selectStorage);
  const storageWarning = useSelector(selectStorageWarning);

  // the detector may set e.g. "en-US"; resolvedLanguage is one of ours
  const currentLang = i18n.resolvedLanguage ?? i18n.language;

  const changeLang = (lang: string) => {
    i18n.changeLanguage(lang);
    moment.updateLocale(i18n.language, {});
  };

  const onLogoutClick = () => {
    dispatch(logout());
    navigate("/");
  };

  const warningIcon = (
    <FontAwesomeIcon icon={faCircleExclamation} className="storage-warning" />
  );

  const profileItems: IMenuItem[] = [
    ...(storage
      ? [
          {
            key: "storage",
            disabled: true,
            label: (
              <>
                <span>
                  {formatBytes(storage.usedBytes)} /{" "}
                  {formatBytes(storage.limitBytes)}
                </span>
                {storageWarning && warningIcon}
              </>
            ),
          },
        ]
      : []),
    {
      key: "preferences",
      label: t("nav.preferences"),
      onClick: () => navigate("/preferences"),
    },
    {
      key: "logout",
      label: t("nav.logout"),
      onClick: onLogoutClick,
      separated: true,
    },
  ];

  return (
    <header>
      <Link to="/">
        <img src={Logo} alt="Mr metis logo" className="logo" />
      </Link>
      <div className="center">{(authenticated || isDemo) && <QuickAdd />}</div>
      <div className="right">
        <Menu
          className="lang-select"
          trigger={
            <>
              {currentLang.toUpperCase()}
              <FontAwesomeIcon icon={faChevronDown} className="chevron" />
            </>
          }
          items={languages
            .filter((l) => l !== currentLang)
            .map((l) => ({
              key: l,
              label: l.toUpperCase(),
              onClick: () => changeLang(l),
            }))}
        />
        {authenticated && (
          <Menu
            className="profile"
            align="right"
            triggerLabel={
              storageWarning
                ? `${t("nav.profile")}: ${t("storage.almostFull")}`
                : t("nav.profile")
            }
            trigger={
              <span className="profile-icon">
                <FontAwesomeIcon icon={faCircleUser} />
                {storageWarning && (
                  <span className="warning-badge">{warningIcon}</span>
                )}
              </span>
            }
            items={profileItems}
          />
        )}
        {!authenticated && (
          <div className="auth-links">
            <Link to="/login" className="btn small secondary">
              {t("nav.login")}
            </Link>
            <Link to="/register" className="btn small primary">
              {t("nav.register")}
            </Link>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
