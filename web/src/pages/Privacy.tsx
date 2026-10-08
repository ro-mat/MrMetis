import { useTranslation } from "react-i18next";

const Privacy = () => {
  const { t } = useTranslation();

  return (
    <div className="main">
      <section>
        <div className="sitewidth">
          <h2>{t("privacy.header")}</h2>
          <p>{t("privacy.text1")}</p>
          <p>{t("privacy.text2")}</p>
          <p>{t("privacy.text3")}</p>
        </div>
      </section>
    </div>
  );
};

export default Privacy;
