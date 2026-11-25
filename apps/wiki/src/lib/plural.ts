import { PRODUCT_LOCALE } from "@lootlog/domain/locale";

const pluralRules = new Intl.PluralRules(PRODUCT_LOCALE);

export type PluralForm = "one" | "few" | "many";

export const pluralForm = (count: number): PluralForm => {
  const form = pluralRules.select(count);

  return form === "one" || form === "few" ? form : "many";
};
