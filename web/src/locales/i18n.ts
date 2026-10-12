import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import moment from "moment";
// the ESM build: "moment/locale/ru" registers on a second copy of moment in the bundle
import "moment/dist/locale/ru";
import { registerLocale } from "react-datepicker";
import { enUS as dateFnsEn, ru as dateFnsRu } from "date-fns/locale";
import en from "./en.json";
import ru from "./ru.json";

const resources = {
  en: {
    translation: en,
  },
  ru: {
    translation: ru,
  },
};

// the datepicker's month and day names
registerLocale("en", dateFnsEn);
registerLocale("ru", dateFnsRu);

// Month and day names (moment) follow the app's language. Registered before
// react-i18next's own handler, so components re-render with the new names.
const setMomentLocale = () =>
  moment.locale(i18n.resolvedLanguage ?? i18n.language);
i18n.on("languageChanged", setMomentLocale);

i18n
  .use(initReactI18next)
  .use(LanguageDetector)
  .init({
    resources: resources,
    fallbackLng: "en",
    interpolation: {
      escapeValue: false, // react already safes from xss
    },
    debug: false,
  });
setMomentLocale();

// dev: i18next copies the resources once, so edited translations need to be
// handed over again (otherwise new keys show up only after a reload)
if (import.meta.hot) {
  import.meta.hot.accept(["./en.json", "./ru.json"], ([enModule, ruModule]) => {
    [enModule, ruModule].forEach((module, i) => {
      if (module) {
        i18n.addResourceBundle(
          ["en", "ru"][i],
          "translation",
          module.default,
          true,
          true
        );
      }
    });
    i18n.changeLanguage(i18n.resolvedLanguage ?? i18n.language);
  });
}

export default i18n;
