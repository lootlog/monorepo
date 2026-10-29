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

export type ItemTileProps = {
  color?: string;
  item: GameItem;
  labels: ItemTileLabels;
  renderStat?: (displayValue: ItemDisplayValue) => ReactNode;
  shareIndex?: number;
  shareNickname?: string;
};

export const ItemTile: FC<ItemTileProps> = ({
  color = "",
  item: { icon, name, rarity, stat, type },
  labels,
  renderStat = fallbackRenderStat,
  shareIndex,
  shareNickname,
}) => {
  const sharedTooltip = useSharedTooltip();
  const normalizedRarity = rarity ?? ItemRarity.COMMON;
  const triggerClassName = "w-fit appearance-none border-0 bg-transparent p-0";

  const tooltipBorderClassName = cn(
    "w-80 overflow-hidden rounded-xl border-[color-mix(in_oklab,var(--item-rarity)_40%,var(--border))] bg-popover/95 p-0 text-left text-wrap backdrop-blur-md",
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

  const tooltipContent = (
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
