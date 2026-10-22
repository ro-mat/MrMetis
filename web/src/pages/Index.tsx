import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { TAppDispatch } from "store/store";
import { startDemo } from "store/userdata/userdata.actions";
import { useTranslation } from "react-i18next";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import { faGithub } from "@fortawesome/free-brands-svg-icons";
import {
  faBolt,
  faBuildingColumns,
  faCalculator,
  faCalendarDays,
  faChartPie,
  faCircleCheck,
  faFileExport,
  faHardDrive,
  faHourglassHalf,
  faLock,
  faWallet,
} from "@fortawesome/free-solid-svg-icons";
import { CtaButton, TextInput } from "components/ui";
import PlanningScreenshot from "styles/img/screenshot-planning.png";
import BudgetEditScreenshot from "styles/img/screenshot-budget-edit.png";
import QuickAddScreenshot from "styles/img/screenshot-quickadd.png";
import usePageMeta from "hooks/usePageMeta";

// key under landingPage.features
const features: [string, IconDefinition][] = [
  ["planAhead", faCalendarDays],
  ["formulas", faCalculator],
  ["quickAdd", faBolt],
  ["dashboard", faChartPie],
  ["accounts", faWallet],
  ["export", faFileExport],
];

// key under landingPage.roadmap.items, done
const roadmap: [string, boolean][] = [
  ["firstRelease", true],
  ["smartAmounts", true],
  ["rebuiltApp", true],
  ["onDevice", true],
  ["productionLaunch", true],
  ["selfHosting", false],
  ["sharedAccount", false],
  ["bankImport", false],
];

const Index = () => {
  const dispatch = useDispatch<TAppDispatch>();
  const { t } = useTranslation();
  const navigate = useNavigate();
  usePageMeta(undefined, t("meta.index"));

  const handleDemoClick = () => {
    dispatch(startDemo());
    navigate("/dashboard");
  };

  return (
    <>
      <div className="main">
        <section>
          <div className="sitewidth">
            <h2>{t("landingPage.welcome.header")}</h2>
            <p className="tagline">{t("landingPage.welcome.text1")}</p>
            <p>{t("landingPage.welcome.text2")}</p>
            <div className="actions">
              <CtaButton type="button" size="big" onClick={handleDemoClick}>
                {t("landingPage.welcome.buttonText")}
              </CtaButton>
              <Link to="/encryption" className="btn big secondary">
                <FontAwesomeIcon icon={faLock} />{" "}
                {t("landingPage.welcome.encryptionLink")}
              </Link>
            </div>
            <p className="note">{t("landingPage.welcome.demoNote")}</p>
          </div>
        </section>
        <section>
          <div className="sitewidth">
            <img
              src={PlanningScreenshot}
              alt={t("landingPage.screenshots.planning")}
              className="screenshot"
            />
          </div>
        </section>
        <section>
          <div className="sitewidth">
            <h3>{t("landingPage.features.header")}</h3>
            <div className="bulletPoints">
              {features.map(([key, icon]) => (
                <div key={key}>
                  <div className="icon">
                    <FontAwesomeIcon icon={icon} />
                  </div>
                  <h4>{t(`landingPage.features.${key}.header`)}</h4>
                  <p>{t(`landingPage.features.${key}.text`)}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
        <section>
          <div className="sitewidth">
            <h3>{t("landingPage.showcase.header")}</h3>
            <div className="showcase">
              <div>
                <h4>{t("landingPage.showcase.formulas.header")}</h4>
                <p>{t("landingPage.showcase.formulas.text")}</p>
              </div>
              <img
                src={BudgetEditScreenshot}
                alt={t("landingPage.screenshots.budgetEdit")}
                className="screenshot"
                loading="lazy"
              />
            </div>
            <div className="showcase">
              <div>
                <h4>{t("landingPage.showcase.quickAdd.header")}</h4>
                <p>{t("landingPage.showcase.quickAdd.text")}</p>
              </div>
              <img
                src={QuickAddScreenshot}
                alt={t("landingPage.screenshots.quickAdd")}
                className="screenshot"
                loading="lazy"
              />
            </div>
          </div>
        </section>
        <section>
          <div className="sitewidth">
            <h3>{t("landingPage.bulletPoints.header")}</h3>
            <div className="bulletPoints">
              <div>
                <div className="icon">
                  <FontAwesomeIcon icon={faLock} />
                </div>
                <h4>{t("landingPage.bulletPoints.private.header")}</h4>
                <p>{t("landingPage.bulletPoints.private.text")}</p>
                <p>
                  <Link to="/encryption">
                    {t("landingPage.bulletPoints.private.urlText")}
                  </Link>
                </p>
              </div>
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
                  <FontAwesomeIcon icon={faBuildingColumns} />
                </div>
                <h4>{t("landingPage.bulletPoints.noBank.header")}</h4>
                <p>{t("landingPage.bulletPoints.noBank.text")}</p>
              </div>
              <div>
                <div className="icon">
                  <FontAwesomeIcon icon={faHardDrive} />
                </div>
                <h4>{t("landingPage.bulletPoints.onDevice.header")}</h4>
                <p>{t("landingPage.bulletPoints.onDevice.text")}</p>
                <p>
                  <Link to="/register?mode=local">
                    {t("landingPage.bulletPoints.onDevice.urlText")}
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </section>
        <section>
          <div className="sitewidth">
            <h3>{t("landingPage.roadmap.header")}</h3>
            <ol className="roadmap">
              {roadmap.map(([key, done]) => (
                <li key={key} className={done ? "done" : ""}>
                  <FontAwesomeIcon
                    icon={done ? faCircleCheck : faHourglassHalf}
                    className="icon"
                  />
                  <div>
                    <h4>
                      {t(`landingPage.roadmap.items.${key}.header`)}{" "}
                      <span className="when">
                        {done
                          ? t(`landingPage.roadmap.items.${key}.when`)
                          : t("landingPage.roadmap.planned")}
                      </span>
                    </h4>
                    <p>{t(`landingPage.roadmap.items.${key}.text`)}</p>
                  </div>
                </li>
              ))}
            </ol>
            <p>
              {t("landingPage.roadmap.requestFeature")}{" "}
              <a
                href="https://github.com/ro-mat/MrMetis/issues"
                target="_blank"
                rel="noreferrer"
              >
                {t("landingPage.roadmap.requestFeatureLink")}
              </a>
            </p>
          </div>
        </section>
      </div>
    </>
  );
};

export default Index;
