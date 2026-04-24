import type { ItemDisplayValue } from "@lootlog/ui/components/item-stat-utils";
import type { ReactNode } from "react";
import itemStats from "@/i18n/translations/item-stats.json";

type TranslationValue = string | TranslationTree;

interface TranslationTree {
  [key: string]: TranslationValue;
}

const tagClassNames = {
  description: "block text-center text-muted-foreground",
  gold: "text-primary",
  legbon: "text-green-500",
  value: "font-bold text-primary",
} as const;

function resolveTranslation(path: string) {
  const value = path.split(".").reduce<unknown>((currentValue, segment) => {
    if (
      currentValue &&
      typeof currentValue === "object" &&
      segment in currentValue
    ) {
      return (currentValue as TranslationTree)[segment];
    }

    return undefined;
  }, itemStats);

  return typeof value === "string" ? value : undefined;
}

function formatValue(
  rawValue: string | string[] | number | boolean | undefined,
) {
  if (Array.isArray(rawValue)) {
    return rawValue.join(",\u00A0");
  }

  if (typeof rawValue === "string") {
    return rawValue.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  }

  return String(rawValue ?? "");
}

function getTemplateValues(displayValue: ItemDisplayValue) {
  if (Array.isArray(displayValue.value) && !displayValue.translateKey) {
    return displayValue.value.reduce<Record<string, string>>(
      (values, rawValue, valueIndex) => {
        values[`value${valueIndex + 1}`] = formatValue(rawValue);

        return values;
      },
      {},
    );
  }

  if (displayValue.translateKey && Array.isArray(displayValue.value)) {
    return {
      value: displayValue.value
        .map(
          (translationKey) =>
            resolveTranslation(
              `${displayValue.translateKey}.${translationKey}`,
            ) ?? translationKey,
        )
        .join(",\u00A0"),
    };
  }

  return {
    value: formatValue(displayValue.value),
  };
}

function interpolateTemplate(template: string, values: Record<string, string>) {
  return template.replace(/{{\s*(\w+)\s*}}/g, (_match, variableName) => {
    return values[variableName] ?? "";
  });
}

function renderTaggedTemplate(template: string) {
  const tagPattern = /<(value|description|gold|legbon)>(.*?)<\/\1>/gs;
  const nodes: ReactNode[] = [];
  let currentIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = tagPattern.exec(template))) {
    const [rawMatch, tagName, tagContent] = match;

    if (match.index > currentIndex) {
      nodes.push(template.slice(currentIndex, match.index));
    }

    nodes.push(
      <span
        className={tagClassNames[tagName as keyof typeof tagClassNames]}
        key={`${tagName}-${match.index}`}
      >
        {tagContent}
      </span>,
    );
    currentIndex = match.index + rawMatch.length;
  }

  if (currentIndex < template.length) {
    nodes.push(template.slice(currentIndex));
  }

  return nodes;
}

export function renderItemStat(displayValue: ItemDisplayValue) {
  if (!displayValue.key) {
    return null;
  }

  const template = resolveTranslation(displayValue.key);

  if (!template) {
    return (
      <span>
        <span className="text-muted-foreground">{displayValue.key}: </span>
        <span className="font-semibold text-primary">
          {formatValue(displayValue.value)}
        </span>
      </span>
    );
  }

  const interpolatedTemplate = interpolateTemplate(
    template,
    getTemplateValues(displayValue),
  );

  return <>{renderTaggedTemplate(interpolatedTemplate)}</>;
}
