import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

const Footer = () => {
  const { t } = useTranslation();

  return (
    <footer>
      <div className="sitewidth">
        {import.meta.env.VITE_APP_VERSION ?? "dev"}{" "}
        <a
          href="https://github.com/ro-mat/MrMetis"
          target="_blank"
          rel="noreferrer"
        >
          GitHub
        </a>{" "}
        <Link to="/encryption">{t("footer.encryption")}</Link>{" "}
        <Link to="/privacy">{t("footer.privacy")}</Link>{" "}
        <a
          href="https://buymeacoffee.com/mrmetis"
          target="_blank"
          rel="noreferrer"
        >
          {t("footer.buyMeCoffee")}
        </a>
      </div>
    </footer>
  );
};

export default Footer;
