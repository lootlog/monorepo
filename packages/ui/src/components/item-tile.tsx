import { ItemImage } from "@lootlog/ui/components/item-image";
import { ItemRarity } from "@lootlog/ui/lib/item-rarity";
import type { ItemDisplayValue } from "@lootlog/ui/components/item-stat-utils";
import {
  fallbackRenderStat,
  ITEM_RARITY_STYLES,
  ItemTileDetails,
} from "@lootlog/ui/components/item-tile-details";
import { useSharedTooltip } from "@lootlog/ui/components/shared-tooltip-provider";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@lootlog/ui/components/tooltip";
import { cn } from "cn";
import type { FC, ReactNode } from "react";

export type GameItem = {
  icon: string;
  name: string;
  rarity?: ItemRarity | null;
  stat: string;
  type?: string | null;
};

export type ItemTileLabels = {
  obtainedBy?: string;
  rarity: Record<string, string>;
  type: Record<string, string>;
};

/** An item the tooltip shows beside this one, such as the one worn instead. */
export type ItemTileComparison = {
  item: GameItem;
  /** What the compared item is, shown above it. */
  label: string;
};

export type ItemTileProps = {
  color?: string;
  comparison?: ItemTileComparison;
  item: GameItem;
  labels: ItemTileLabels;
  renderStat?: (displayValue: ItemDisplayValue) => ReactNode;
  shareIndex?: number;
  shareNickname?: string;
};

const TOOLTIP_FRAME_CLASS_NAME =
  "w-80 overflow-hidden rounded-xl border-[color-mix(in_oklab,var(--item-rarity)_40%,var(--border))] bg-popover/95 text-left text-wrap backdrop-blur-md";

export const ItemTile: FC<ItemTileProps> = ({
  color = "",
  comparison,
  item: { icon, name, rarity, stat, type },
  labels,
  renderStat = fallbackRenderStat,
  shareIndex,
  shareNickname,
}) => {
  const sharedTooltip = useSharedTooltip();
  const normalizedRarity = rarity ?? ItemRarity.COMMON;
  const triggerClassName = "w-fit appearance-none border-0 bg-transparent p-0";

  const tooltipBorderClassName = comparison
    ? "w-fit border-0 bg-transparent p-0 text-left text-wrap"
    : cn(
        TOOLTIP_FRAME_CLASS_NAME,
        "p-0",
        ITEM_RARITY_STYLES[normalizedRarity].accent,
      );

  const itemImage = (
    <ItemImage
      color={color}
      icon={icon}
      rarity={normalizedRarity}
      shareIndex={shareIndex}
    />
  );

  const details = (
    <ItemTileDetails
      color={color}
      icon={icon}
      labels={labels}
      name={name}
      rarity={normalizedRarity}
      renderStat={renderStat}
      shareNickname={shareNickname}
      stat={stat}
      type={type ?? ""}
    />
  );

  const comparedRarity = comparison?.item.rarity ?? ItemRarity.COMMON;

  // Side by side where there is room, the item first and then the one it is
  // compared with, each in its own rarity's frame.
  const tooltipContent = comparison ? (
    <div className="flex flex-col items-start gap-2 sm:flex-row">
      <div
        className={cn(
          TOOLTIP_FRAME_CLASS_NAME,
          "border",
          ITEM_RARITY_STYLES[normalizedRarity].accent,
        )}
      >
        {details}
      </div>
      <div
        className={cn(
          TOOLTIP_FRAME_CLASS_NAME,
          "border",
          ITEM_RARITY_STYLES[comparedRarity].accent,
        )}
      >
        <p className="border-b border-border bg-muted/30 px-3 py-1.5 text-xs font-medium text-muted-foreground">
          {comparison.label}
        </p>
        <ItemTileDetails
          color=""
          icon={comparison.item.icon}
          labels={labels}
          name={comparison.item.name}
          rarity={comparedRarity}
          renderStat={renderStat}
          stat={comparison.item.stat}
          type={comparison.item.type ?? ""}
        />
      </div>
    </div>
  ) : (
    details
  );

  if (sharedTooltip) {
    return (
      <button
        aria-label={name}
        className={triggerClassName}
        onBlur={sharedTooltip.hideTooltip}
        onFocus={({ currentTarget }) =>
          sharedTooltip.showTooltip(
            tooltipContent,
            currentTarget.getBoundingClientRect(),
            {
              contentClassName: tooltipBorderClassName,
              triggerElement: currentTarget,
            },
          )
        }
        onMouseEnter={({ currentTarget }) =>
          sharedTooltip.showTooltip(
            tooltipContent,
            currentTarget.getBoundingClientRect(),
            {
              contentClassName: tooltipBorderClassName,
              triggerElement: currentTarget,
            },
          )
        }
        onMouseLeave={sharedTooltip.hideTooltip}
        type="button"
      >
        {itemImage}
      </button>
    );
  }

  return (
    <TooltipProvider delay={100}>
      <Tooltip>
        <TooltipTrigger
          render={
            <button
              aria-label={name}
              className={triggerClassName}
              type="button"
            />
          }
        >
          {itemImage}
        </TooltipTrigger>
        <TooltipContent className={tooltipBorderClassName}>
          {tooltipContent}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
