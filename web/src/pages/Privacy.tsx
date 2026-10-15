import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

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
          <p>
            <Link to="/encryption">{t("privacy.encryptionLink")}</Link>
          </p>
        </div>
      </section>
    </div>
  );
};

export default Privacy;
