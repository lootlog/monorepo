import i18n from "./config";

export const getFixedT = (namespace: string) => {
  return i18n.getFixedT(i18n.resolvedLanguage ?? i18n.language, namespace);
};
