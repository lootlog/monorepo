import { itemStatUpgradeLevel } from "@lootlog/domain/item-upgrade";
import { ItemImage } from "@lootlog/ui/components/item-image";
import type { DisplayItemRarity } from "@lootlog/domain/item-rarity";
import { ITEM_RARITY_STYLES } from "@lootlog/ui/lib/item-rarity-colors";
import {
  ITEM_STAT_FOOTER_SECTIONS,
  mapStatsToDisplaySections,
  type ItemDisplayValue,
} from "@lootlog/ui/components/item-stat-utils";
import { ItemStatLine } from "@lootlog/ui/components/item-stat-line";
import { parseItemStatEntries } from "@lootlog/domain/item-stat";
import { cn } from "cn";
import { Star } from "lucide-react";
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

const renderItemStatLine = (displayValue: ItemDisplayValue) => (
  <ItemStatLine displayValue={displayValue} />
);

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
  children?: ReactNode;
  color: string;
  labels: ItemTileLabels;
  renderStat?: (displayValue: ItemDisplayValue) => ReactNode;
  icon: string;
  name: string;
  rarity: DisplayItemRarity;
  shareNickname?: string;
  stat: string;
  type: string;
};

export const ItemTileDetails: FC<ItemTileDetailsProps> = ({
  children,
  color,
  icon,
  labels,
  name,
  rarity,
  renderStat = renderItemStatLine,
  shareNickname,
  stat,
  type,
}) => {
  const statSections = mapStatsToDisplaySections(parseItemStatEntries(stat));

  const bodySections = statSections.filter(
    ({ index }) => !ITEM_STAT_FOOTER_SECTIONS.has(index),
  );

  const footerValues = statSections
    .filter(({ index }) => ITEM_STAT_FOOTER_SECTIONS.has(index))
    .flatMap(({ values }) => values);

  const showObtainedBy = Boolean(shareNickname && labels.obtainedBy);

  const typeLabel = type ? (labels.type[type] ?? type) : null;

  const upgradeLevel = itemStatUpgradeLevel(stat);

  return (
    <>
      <div className="flex items-center gap-3 px-3 pt-3 pb-2.5">
        <ItemImage
          className="shrink-0"
          color={color}
          icon={icon}
          rarity={rarity}
          upgradeLevel={upgradeLevel}
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
        {upgradeLevel > 0 ? (
          <span
            role="img"
            aria-label={`${labels.upgradeLevel} +${upgradeLevel}`}
            className="relative grid size-7 shrink-0 place-items-center self-start"
          >
            <Star
              aria-hidden="true"
              className="absolute inset-0 size-7 fill-amber-300 text-amber-600"
              strokeWidth={1.5}
            />
            <span className="relative pt-px text-2xs leading-none font-bold text-amber-950 tabular-nums">
              {upgradeLevel}
            </span>
          </span>
        ) : null}
      </div>
      <div aria-hidden="true" className="flex items-center gap-1.5 px-3">
        <span className="h-px flex-1 bg-[color-mix(in_oklab,var(--item-rarity)_45%,transparent)]" />
        <span className="size-1 rotate-45 bg-[color-mix(in_oklab,var(--item-rarity)_60%,transparent)]" />
        <span className="size-1.5 rotate-45 bg-(--item-rarity)" />
        <span className="size-1 rotate-45 bg-[color-mix(in_oklab,var(--item-rarity)_60%,transparent)]" />
        <span className="h-px flex-1 bg-[color-mix(in_oklab,var(--item-rarity)_45%,transparent)]" />
      </div>
      {bodySections.length > 0 ? (
        <div className="flex flex-col divide-y divide-border px-3 text-xs leading-5 text-foreground/85">
          {bodySections.map(({ index, values }) => (
            <div key={index} className="flex flex-col gap-0.5 py-2">
              {renderStatRows(values, renderStat)}
            </div>
          ))}
        </div>
      ) : null}
      {children}
      {footerValues.length > 0 || showObtainedBy ? (
        <div className="flex flex-col gap-0.5 border-t border-border bg-muted/30 px-3 py-2 text-xs leading-5 text-muted-foreground">
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
