import { LanguageVersion } from "@/store/global.store";

const EN_DOMAIN = "margonem.com";

export const getLanguageVersion = (url: string): LanguageVersion => {
  try {
    const parsedUrl = new URL(url);
    if (parsedUrl.hostname === EN_DOMAIN) {
      return LanguageVersion.EN;
    }
  } catch (e) {
    // If the URL can't be parsed, fall through to PL
  }

  return LanguageVersion.PL;
};
