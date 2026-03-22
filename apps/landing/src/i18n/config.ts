import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import landing from "./translations/landing.json";

i18n.use(initReactI18next).init({
  resources: {
    pl: {
      translation: {
        landing,
      },
    },
  },
  lng: "pl",
  fallbackLng: "pl",
  interpolation: {
    escapeValue: false,
  },
  react: {
    useSuspense: false,
  },
  returnNull: false,
});
