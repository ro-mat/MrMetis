import React from "react";
import "styles/index.scss";
import planning_table from "styles/img/planning_table.png";
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
            <div className="init">
              <div>
                <h3>{t("landingPage.1.header")}</h3>
                <p>{t("landingPage.1.text1")}</p>
                <p>{t("landingPage.1.text2")}</p>
                <p>{t("landingPage.1.text3")}</p>
                <button onClick={handleDemoClick} className="btn primary">
                  {t("landingPage.1.buttonText")}
                </button>
              </div>
              <div>
                <img src={planning_table} alt="personal finances table" />
              </div>
            </div>
          </div>
        </section>
        <section>
          <div className="sitewidth">
            <h3>{t("landingPage.2.header")}</h3>
            <p>{t("landingPage.2.text1")}</p>
            <p>{t("landingPage.2.text2")}</p>
          </div>
        </section>
        <section>
          <div className="sitewidth">
            <h3>{t("landingPage.3.header")}</h3>
            <ul>
              <li>{t("landingPage.3.text1")}</li>
              <li>
                <Link to="/privacy">{t("landingPage.3.text2")}</Link>
              </li>
              <li>{t("landingPage.3.text3")}</li>
              <li>{t("landingPage.3.text4")}</li>
              <li>{t("landingPage.3.text5")}</li>
            </ul>
          </div>
        </section>
        <section>
          <div className="sitewidth">
            <h3>{t("landingPage.4.header")}</h3>
            <h4>{t("landingPage.4.section1.header")}</h4>
            <ul>
              <li>{t("landingPage.4.section1.text1")}</li>
              <li>{t("landingPage.4.section1.text2")}</li>
              <li>{t("landingPage.4.section1.text3")}</li>
              <li>{t("landingPage.4.section1.text4")}</li>
              <li>{t("landingPage.4.section1.text5")}</li>
              <li>{t("landingPage.4.section1.text6")}</li>
              <li>{t("landingPage.4.section1.text7")}</li>
              <li>{t("landingPage.4.section1.text8")}</li>
              <li>{t("landingPage.4.section1.text9")}</li>
            </ul>
            <h4>{t("landingPage.4.section2.header")}</h4>
            <ul>
              <li>{t("landingPage.4.section2.text1")}</li>
              <li>{t("landingPage.4.section2.text2")}</li>
              <li>{t("landingPage.4.section2.text3")}</li>
              <li>{t("landingPage.4.section2.text4")}</li>
              <li>{t("landingPage.4.section2.text5")}</li>
            </ul>
          </div>
        </section>
        <section>
          <div className="sitewidth">
            <h3>{t("landingPage.5.header")}</h3>
            <div className="init">
              <div>
                <p>{t("landingPage.5.text1")}</p>
                <button onClick={handleDemoClick} className="btn primary">
                  {t("landingPage.5.button1Text")}
                </button>
              </div>
              <div>
                <p>{t("landingPage.5.text2")}</p>
                <Link to="/register" className="btn primary">
                  {t("landingPage.5.button2Text")}
                </Link>
              </div>
            </div>
          </div>
        </section>
      </div>
    </>
  );
};

export default Index;
