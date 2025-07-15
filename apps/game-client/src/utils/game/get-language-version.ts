import { LanguageVersion } from "@/store/global.store";

const EN_DOMAIN = "margonem.com";

export const getLanguageVersion = (url: string): LanguageVersion => {
  if (url.includes(EN_DOMAIN)) {
    return LanguageVersion.EN;
  }

  return LanguageVersion.PL;
};
