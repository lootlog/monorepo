import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import battle from "./translations/battle.json" with { type: "json" };

let isInitialized = false;

export const initBattleI18n = () => {
  if (isInitialized || i18n.isInitialized) {
    return i18n;
  }

  i18n.use(initReactI18next).init({
    resources: {
      pl: {
        translation: {
          battle,
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
  });

  isInitialized = true;
  return i18n;
};

// Auto-initialize when imported
initBattleI18n();

export default i18n;
