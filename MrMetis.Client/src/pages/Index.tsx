import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { TAppDispatch } from "store/store";
import { SET_ISDEMO } from "store/auth/auth.slice";
import { initDemoData } from "helpers/demoHelper";
import {
  SET_ACCOUNTS,
  SET_BUDGETS,
  SET_STATEMENTS,
} from "store/userdata/userdata.slice";
import { useTranslation } from "react-i18next";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faGithub } from "@fortawesome/free-brands-svg-icons";
import { faLock } from "@fortawesome/free-solid-svg-icons";

const Index = () => {
  const dispatch = useDispatch<TAppDispatch>();
  const { t } = useTranslation();
  const navigate = useNavigate();

  const handleDemoClick = () => {
    const data = initDemoData();
    dispatch(SET_STATEMENTS(data.statements));
    dispatch(SET_BUDGETS(data.budgets));
    dispatch(SET_ACCOUNTS(data.accounts));

    dispatch(SET_ISDEMO(true));

    navigate("/dashboard");
  };

  return (
    <>
      <div className="main">
        <section>
          <div className="sitewidth">
            <h2>{t("landingPage.welcome.header")}</h2>
            <p>{t("landingPage.welcome.text1")}</p>
            <p>{t("landingPage.welcome.text2")}</p>
            <input
              type="button"
              onClick={handleDemoClick}
              className="btn primary"
              value={t("landingPage.welcome.buttonText")}
            />
          </div>
        </section>
        <section>
          <div className="sitewidth">
            <h3>{t("landingPage.about.header")}</h3>
            <p>{t("landingPage.about.text1")}</p>
            <p>{t("landingPage.about.text2")}</p>
          </div>
        </section>
        <section>
          <div className="sitewidth">
            <h3>{t("landingPage.bulletPoints.header")}</h3>
            <div className="bulletPoints">
              <div>
                <div className="icon">
                  <FontAwesomeIcon icon={faGithub} />
                </div>
                <h4>{t("landingPage.bulletPoints.openSource.header")}</h4>
                <p>
                  {t("landingPage.bulletPoints.openSource.text")}{" "}
                  <a
                    href="https://github.com/ro-mat/MrMetis"
                    target="_blank"
                    rel="noreferrer"
                  >
                    {t("landingPage.bulletPoints.openSource.urlText")}
                  </a>
                </p>
              </div>
              <div>
                <div className="icon">
                  <FontAwesomeIcon icon={faLock} />
                </div>
                <h4>{t("landingPage.bulletPoints.private.header")}</h4>
                <p>{t("landingPage.bulletPoints.private.text")}</p>
                <p>
                  <Link to="privacy">
                    {t("landingPage.bulletPoints.private.urlText")}
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </section>
        <section>
          <div className="sitewidth">
            <h3>{t("landingPage.newsletter.header")}</h3>
            <p>{t("landingPage.newsletter.text")}</p>
            <div>
              <form action="">
                <input
                  type="text"
                  disabled
                  placeholder={t("landingPage.newsletter.inputPlaceholder")}
                />
                <input
                  type="submit"
                  disabled
                  className="btn primary"
                  value={t("landingPage.newsletter.buttonText")}
                />
              </form>
            </div>
          </div>
        </section>
      </div>
    </>
  );
};

export default Index;
