import {
  formatItemDisplayValue,
  ITEM_STAT_TAG_CLASS_NAMES,
  type ItemDisplayValue,
} from "@lootlog/ui/components/item-stat-utils";
import type { ReactNode } from "react";
import { itemStatTagPattern, itemStatTemplate } from "@/lib/item-stat-text";

const tagClassNames = new Map(Object.entries(ITEM_STAT_TAG_CLASS_NAMES));

function renderTaggedTemplate(template: string) {
  const tagPattern = itemStatTagPattern();
  const nodes: ReactNode[] = [];
  let currentIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = tagPattern.exec(template))) {
    const [rawMatch = "", tagName = "", tagContent = ""] = match;

    if (match.index > currentIndex) {
      nodes.push(template.slice(currentIndex, match.index));
    }

    nodes.push(
      <span
        className={tagClassNames.get(tagName)}
        key={`${tagName}-${match.index}`}
      >
        {renderTaggedTemplate(tagContent)}
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

  const template = itemStatTemplate(displayValue);

  if (!template) {
    return (
      <span>
        <span className="text-muted-foreground">{displayValue.key}: </span>
        <span className="font-semibold text-primary">
          {formatItemDisplayValue(displayValue.value)}
        </span>
      </span>
    );
  }

  return <>{renderTaggedTemplate(template)}</>;
}
