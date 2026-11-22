import {
  formatItemDisplayValue,
  getItemStatTemplateValues,
  ITEM_STAT_TAG_CLASS_NAMES,
  type ItemDisplayValue,
} from "@lootlog/ui/components/item-stat-utils";
import { createTranslationLookup } from "@lootlog/ui/i18n/translation-lookup";
import itemStats from "@lootlog/ui/i18n/translations/item-stats.json";

const translations = createTranslationLookup(itemStats);

const resolveTranslation = (path: string) =>
  translations.get(
    path.startsWith("itemStats.") ? path.slice("itemStats.".length) : path,
  );

const ITEM_STAT_TAG_NAMES = Object.keys(ITEM_STAT_TAG_CLASS_NAMES).join("|");

export const itemStatTagPattern = () =>
  new RegExp(`<(${ITEM_STAT_TAG_NAMES})>(.*?)</\\1>`, "gs");

export const itemStatTemplate = (displayValue: ItemDisplayValue) => {
  const template = displayValue.key && resolveTranslation(displayValue.key);

  if (!template) return undefined;

  const values: Partial<Record<string, string | number | boolean>> =
    getItemStatTemplateValues(
      displayValue,
      (key, fallback) => resolveTranslation(key) ?? fallback,
    );

  return template.replace(/{{\s*(\w+)\s*}}/g, (_match, name: string) =>
    String(values[name] ?? ""),
  );
};

export const itemStatText = (displayValue: ItemDisplayValue) => {
  if (!displayValue.key) return "";

  const template = itemStatTemplate(displayValue);

  if (!template) {
    return `${displayValue.key}: ${formatItemDisplayValue(displayValue.value)}`;
  }

  let text = template;
  let untagged = text.replace(itemStatTagPattern(), "$2");

  while (untagged !== text) {
    text = untagged;
    untagged = text.replace(itemStatTagPattern(), "$2");
  }

  return text;
};
