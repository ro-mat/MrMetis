import { useTranslation } from "react-i18next";
import usePageMeta from "hooks/usePageMeta";

const sourceUrl =
  "https://github.com/ro-mat/MrMetis/blob/main/web/src/services/encryptor.ts";

// key under encryption.steps, in the order they happen
const steps = ["password", "split", "auth", "dataKey", "save", "login"];
// key under encryption.stored
const stored = ["email", "salt", "authHash", "wrappedKey", "userdata"];

const Encryption = () => {
  const { t } = useTranslation();
  usePageMeta(t("encryption.header"), t("meta.encryption"));

  return (
    <div className="main encryption">
      <section>
        <div className="sitewidth">
          <h2>{t("encryption.header")}</h2>
          <p className="tagline">{t("encryption.summary")}</p>
        </div>
      </section>
      <section>
        <div className="sitewidth">
          <h3>{t("encryption.stepsHeader")}</h3>
          <ol className="steps">
            {steps.map((key) => (
              <li key={key}>
                <h4>{t(`encryption.steps.${key}.header`)}</h4>
                <p>{t(`encryption.steps.${key}.text`)}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>
      <section>
        <div className="sitewidth">
          <h3>{t("encryption.storedHeader")}</h3>
          <table className="stored">
            <thead>
              <tr>
                <th>{t("encryption.storedWhat")}</th>
                <th>{t("encryption.storedHow")}</th>
              </tr>
            </thead>
            <tbody>
              {stored.map((key) => (
                <tr key={key}>
                  <td>{t(`encryption.stored.${key}.what`)}</td>
                  <td>{t(`encryption.stored.${key}.how`)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <section>
        <div className="sitewidth">
          <h3>{t("encryption.meaningHeader")}</h3>
          <ul className="meaning">
            <li>{t("encryption.meaning.cantRead")}</li>
            <li>{t("encryption.meaning.leak")}</li>
            <li>{t("encryption.meaning.forgotten")}</li>
            <li>{t("encryption.meaning.device")}</li>
            <li>{t("encryption.meaning.demo")}</li>
          </ul>
        </div>
      </section>
      <section>
        <div className="sitewidth">
          <h3>{t("encryption.verifyHeader")}</h3>
          <p>{t("encryption.verifyText")}</p>
          <p>
            <a href={sourceUrl} target="_blank" rel="noreferrer">
              {t("encryption.verifyLink")}
            </a>
          </p>
        </div>
      </section>
    </div>
  );
};

export default Encryption;
