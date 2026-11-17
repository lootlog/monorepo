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

/** The tags a translated stat marks its parts with for the tooltip. */
export const itemStatTagPattern = () =>
  new RegExp(`<(${ITEM_STAT_TAG_NAMES})>(.*?)</\\1>`, "gs");

/**
 * A stat's line as the game's tooltip words it, its parts still in their
 * tags, or undefined for a stat Lootlog has no wording for.
 */
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

/** A stat's tooltip line as plain text, for a link preview. */
export const itemStatText = (displayValue: ItemDisplayValue) => {
  if (!displayValue.key) return "";

  const template = itemStatTemplate(displayValue);

  if (!template) {
    return `${displayValue.key}: ${formatItemDisplayValue(displayValue.value)}`;
  }

  // Tags nest, as a legendary bonus's value inside its description.
  let text = template;
  let untagged = text.replace(itemStatTagPattern(), "$2");

  while (untagged !== text) {
    text = untagged;
    untagged = text.replace(itemStatTagPattern(), "$2");
  }

  return text;
};
