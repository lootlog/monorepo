import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import settings from "./translations/settings";

i18n.use(initReactI18next).init({
  resources: {
    pl: {
      translation: {
        settings,
      },
    },
  },
  lng: "pl",
  supportedLngs: ["pl"],
  interpolation: {
    escapeValue: false,
  },
  react: {
    useSuspense: false,
  },
  pluralSeparator: "_",
  returnNull: false,
});

export default i18n;
