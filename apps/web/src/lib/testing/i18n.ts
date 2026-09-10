import i18next, { type ResourceLanguage } from "i18next";
import { initReactI18next } from "react-i18next";

export async function initializeTestTranslations(
  translations: ResourceLanguage = {},
) {
  const instance = i18next.createInstance();
  await instance.use(initReactI18next).init({
    lng: "pl",
    fallbackLng: "pl",
    keySeparator: false,
    resources: { pl: { translation: translations } },
    interpolation: { escapeValue: false },
  });

  return instance;
}
