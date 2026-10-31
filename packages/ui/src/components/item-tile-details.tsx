import { ItemImage } from "@lootlog/ui/components/item-image";
import { ItemRarity } from "@lootlog/ui/lib/item-rarity";
import {
  ITEM_STAT_FOOTER_SECTIONS,
  mapStatsToDisplaySections,
  parseItemStats,
  type ItemDisplayValue,
} from "@lootlog/ui/components/item-stat-utils";
import { cn } from "cn";
import type { FC, ReactNode } from "react";
import type { ItemTileLabels } from "./item-tile";

const formatFallbackValue = (
  rawValue: string | string[] | number | boolean | undefined,
) => {
  if (Array.isArray(rawValue)) {
    return rawValue.join(", ");
  }

  return String(rawValue ?? "");
};

export const fallbackRenderStat = (displayValue: ItemDisplayValue) => {
  if (!displayValue.key) {
    return null;
  }

  return (
    <span>
      <span className="text-muted-foreground">{displayValue.key}: </span>
      <span className="font-semibold text-primary">
        {formatFallbackValue(displayValue.value)}
      </span>
    </span>
  );
};

/**
 * Each rarity tints the tooltip frame and the ornament under the header
 * through `--item-rarity`, and colours the rarity label.
 */
export const ITEM_RARITY_STYLES: Record<
  ItemRarity,
  { accent: string; label: string }
> = {
  [ItemRarity.COMMON]: {
    accent: "[--item-rarity:var(--muted-foreground)]",
    label: "text-muted-foreground",
  },
  [ItemRarity.HEROIC]: {
    accent: "[--item-rarity:#3b82f6]",
    label: "text-blue-400",
  },
  [ItemRarity.LEGENDARY]: {
    accent: "[--item-rarity:#f97316]",
    label: "text-orange-400",
  },
  [ItemRarity.UNIQUE]: {
    accent: "[--item-rarity:#fcd34d]",
    label: "text-amber-300",
  },
  [ItemRarity.UPGRADED]: {
    accent: "[--item-rarity:var(--primary)]",
    label: "text-primary",
  },
};

const renderStatRows = (
  values: ItemDisplayValue[],
  renderStat: (displayValue: ItemDisplayValue) => ReactNode,
) =>
  values.map((displayValue) => (
    <div
      key={`${displayValue.key}-${formatFallbackValue(displayValue.value)}`}
      className="whitespace-pre-line"
    >
      {renderStat(displayValue)}
    </div>
  ));

type ItemTileDetailsProps = {
  color: string;
  labels: ItemTileLabels;
  renderStat: (displayValue: ItemDisplayValue) => ReactNode;
  icon: string;
  name: string;
  rarity: ItemRarity;
  shareNickname?: string;
  stat: string;
  type: string;
};

/** An item's header and stats, as its tooltip shows them and a page can too. */
export const ItemTileDetails: FC<ItemTileDetailsProps> = ({
  color,
  icon,
  labels,
  name,
  rarity,
  renderStat,
  shareNickname,
  stat,
  type,
}) => {
  const statSections = mapStatsToDisplaySections(parseItemStats(stat));

  const bodySections = statSections.filter(
    ({ index }) => !ITEM_STAT_FOOTER_SECTIONS.has(index),
  );

  const footerValues = statSections
    .filter(({ index }) => ITEM_STAT_FOOTER_SECTIONS.has(index))
    .flatMap(({ values }) => values);

  const showObtainedBy = Boolean(shareNickname && labels.obtainedBy);

  const typeLabel = type ? (labels.type[type] ?? type) : null;

  return (
    <>
      <div className="flex items-center gap-3 px-3 pt-3 pb-2.5">
        <ItemImage
          className="shrink-0"
          color={color}
          icon={icon}
          rarity={rarity}
        />
        <div className="min-w-0 flex-1">
          <p className="font-heading text-sm leading-snug font-semibold text-balance text-foreground">
            {name}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            <span
              className={cn("font-medium", ITEM_RARITY_STYLES[rarity].label)}
            >
              {labels.rarity[rarity] ?? rarity}
            </span>
            {typeLabel ? <> · {typeLabel}</> : null}
          </p>
        </div>
      </div>
      <div aria-hidden="true" className="flex items-center gap-1.5 px-3">
        <span className="h-px flex-1 bg-[color-mix(in_oklab,var(--item-rarity)_45%,transparent)]" />
        <span className="size-1 rotate-45 bg-[color-mix(in_oklab,var(--item-rarity)_60%,transparent)]" />
        <span className="size-1.5 rotate-45 bg-(--item-rarity)" />
        <span className="size-1 rotate-45 bg-[color-mix(in_oklab,var(--item-rarity)_60%,transparent)]" />
        <span className="h-px flex-1 bg-[color-mix(in_oklab,var(--item-rarity)_45%,transparent)]" />
      </div>
      {bodySections.length > 0 ? (
        <div className="flex flex-col divide-y divide-border px-3 text-xs leading-5 text-pretty text-foreground/85">
          {bodySections.map(({ index, values }) => (
            <div key={index} className="flex flex-col gap-0.5 py-2">
              {renderStatRows(values, renderStat)}
            </div>
          ))}
        </div>
      ) : null}
      {footerValues.length > 0 || showObtainedBy ? (
        <div className="flex flex-col gap-0.5 border-t border-border bg-muted/30 px-3 py-2 text-xs leading-5 text-pretty text-muted-foreground">
          {renderStatRows(footerValues, renderStat)}
          {showObtainedBy ? (
            <div>
              {labels.obtainedBy}{" "}
              <span className="font-semibold text-foreground">
                {shareNickname}
              </span>
            </div>
          ) : null}
        </div>
      ) : null}
    </>
  );
};
