import { foldText } from "@lootlog/domain/text-fold";
import type {
  SettingsDomainValue,
  SettingsSubsectionValue,
} from "@/constants/settings-tabs";
import type { SettingsControlId } from "./settings-manifest";
import type { SettingsDomainManifestItem } from "./settings-manifest-types";

export interface SettingsSearchItem {
  categoryId: SettingsDomainValue;
  categoryLabel: string;
  subsectionId: SettingsSubsectionValue;
  subsectionLabel: string;
  controlId: SettingsControlId;
  label: string;
  description?: string;
  keywords?: string[];
  order: number;
}

export interface SettingsSearchMatchRange {
  start: number;
  end: number;
}

const normalizeSearchText = (value: string): string =>
  foldText(value).toLowerCase().trim();

const tokenize = (value: string): string[] =>
  value.split(/[\s,.;:()/\\-]+/u).filter(Boolean);

const editDistance = (left: string, right: string, limit: number): number => {
  if (Math.abs(left.length - right.length) > limit) return limit + 1;

  const cell = (row: readonly number[], index: number) =>
    row[index] ?? Number.POSITIVE_INFINITY;

  let previousRow = Array.from({ length: right.length + 1 }, (_, i) => i);
  let previousPreviousRow: number[] | undefined;

  for (let i = 1; i <= left.length; i += 1) {
    const row: number[] = [i];
    let rowMinimum = i;

    for (let j = 1; j <= right.length; j += 1) {
      const substitution = left[i - 1] === right[j - 1] ? 0 : 1;

      let value = Math.min(
        cell(previousRow, j) + 1,
        cell(row, j - 1) + 1,
        cell(previousRow, j - 1) + substitution,
      );

      if (
        previousPreviousRow &&
        i > 1 &&
        j > 1 &&
        left[i - 1] === right[j - 2] &&
        left[i - 2] === right[j - 1]
      ) {
        value = Math.min(value, cell(previousPreviousRow, j - 2) + 1);
      }

      row.push(value);
      rowMinimum = Math.min(rowMinimum, value);
    }

    if (rowMinimum > limit) return limit + 1;
    previousPreviousRow = previousRow;
    previousRow = row;
  }

  return cell(previousRow, right.length);
};

const typoBudget = (token: string): number => {
  if (token.length >= 8) return 2;

  if (token.length >= 4) return 1;

  return 0;
};

const scoreToken = (queryToken: string, text: string): number => {
  if (text === queryToken) return 100;

  if (text.startsWith(queryToken)) return 80;

  const words = tokenize(text);

  if (words.some((word) => word.startsWith(queryToken))) return 60;

  if (text.includes(queryToken)) return 40;

  const budget = typoBudget(queryToken);

  if (budget === 0) return 0;

  let best = 0;

  for (const word of words) {
    if (Math.abs(word.length - queryToken.length) > budget) continue;
    const distance = editDistance(word, queryToken, budget);

    if (distance <= budget) best = Math.max(best, 30 - distance * 8);
  }

  return best;
};

interface SearchableField {
  text: string;
  weight: number;
}

type SearchableFields = [SearchableField, ...SearchableField[]];

const getSearchableFields = (item: SettingsSearchItem): SearchableFields => {
  const fields: SearchableFields = [
    { text: normalizeSearchText(item.label), weight: 1 },
    ...(item.keywords ?? []).map((keyword) => ({
      text: normalizeSearchText(keyword),
      weight: 0.9,
    })),
    { text: normalizeSearchText(item.subsectionLabel), weight: 0.7 },
    { text: normalizeSearchText(item.categoryLabel), weight: 0.6 },
  ];

  if (item.description) {
    fields.push({ text: normalizeSearchText(item.description), weight: 0.5 });
  }

  return fields;
};

const getMatchScore = (
  item: SettingsSearchItem,
  normalizedQuery: string,
  queryTokens: string[],
): number | undefined => {
  const fields = getSearchableFields(item);
  let total = 0;

  for (const queryToken of queryTokens) {
    let best = 0;

    for (const field of fields) {
      best = Math.max(best, scoreToken(queryToken, field.text) * field.weight);
    }

    if (best === 0) return undefined;
    total += best;
  }

  const label = fields[0].text;

  if (label === normalizedQuery) total += 60;
  else if (label.startsWith(normalizedQuery)) total += 40;
  else if (label.includes(normalizedQuery)) total += 20;

  return total;
};

export const searchSettings = (
  items: SettingsSearchItem[],
  query: string,
): SettingsSearchItem[] => {
  const normalizedQuery = normalizeSearchText(query);
  const queryTokens = tokenize(normalizedQuery);

  if (queryTokens.length === 0) return [];

  const matches: { item: SettingsSearchItem; score: number }[] = [];

  for (const item of items) {
    const score = getMatchScore(item, normalizedQuery, queryTokens);

    if (score !== undefined) matches.push({ item, score });
  }

  matches.sort(
    (left, right) =>
      right.score - left.score || left.item.order - right.item.order,
  );

  return matches.map(({ item }) => item);
};

export const findSearchMatchRanges = (
  text: string,
  query: string,
): SettingsSearchMatchRange[] => {
  const normalizedText = normalizeSearchText(text);

  if (normalizedText.length !== text.length) return [];

  const ranges: SettingsSearchMatchRange[] = [];

  for (const token of tokenize(normalizeSearchText(query))) {
    let from = 0;

    while (from <= normalizedText.length - token.length) {
      const index = normalizedText.indexOf(token, from);

      if (index === -1) break;
      ranges.push({ start: index, end: index + token.length });
      from = index + token.length;
    }
  }

  ranges.sort((left, right) => left.start - right.start);

  const merged: SettingsSearchMatchRange[] = [];

  for (const range of ranges) {
    const last = merged.at(-1);

    if (last && range.start <= last.end) {
      last.end = Math.max(last.end, range.end);
    } else {
      merged.push({ ...range });
    }
  }

  return merged;
};

type Translate = (key: string) => string;

export const buildSettingsSearchItems = (
  domains: readonly SettingsDomainManifestItem<SettingsControlId>[],
  t: Translate,
): SettingsSearchItem[] =>
  domains.flatMap((domain, domainIndex) =>
    domain.subsections.flatMap((subsection, subsectionIndex) =>
      subsection.controls.map((control, controlIndex) => ({
        categoryId: domain.id,
        categoryLabel: t(domain.labelKey),
        subsectionId: subsection.id,
        subsectionLabel: t(subsection.labelKey),
        controlId: control.id,
        label: t(control.labelKey),
        description: control.descriptionKey
          ? t(control.descriptionKey)
          : undefined,
        keywords: control.aliases ? [...control.aliases] : undefined,
        order: domainIndex * 10_000 + subsectionIndex * 100 + controlIndex,
      })),
    ),
  );
