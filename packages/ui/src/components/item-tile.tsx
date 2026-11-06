import { itemStatUpgradeLevel } from "@lootlog/domain/item-upgrade";
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
import { useRender } from "@base-ui/react/use-render";
import { cn } from "cn";
import type {
  FC,
  FocusEvent,
  MouseEvent,
  ReactElement,
  ReactNode,
} from "react";

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
  /** Names the upgrade level badge for assistive technology. */
  upgradeLevel: string;
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
  /**
   * The element the icon is drawn in, such as a link to the item's page;
   * a button by default.
   */
  render?: ReactElement;
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
  render = <button type="button" />,
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
      upgradeLevel={itemStatUpgradeLevel(stat)}
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

  const showSharedTooltip = (currentTarget: HTMLElement) =>
    sharedTooltip?.showTooltip(
      tooltipContent,
      currentTarget.getBoundingClientRect(),
      {
        contentClassName: tooltipBorderClassName,
        triggerElement: currentTarget,
      },
    );

  const sharedTrigger = useRender({
    render,
    props: {
      "aria-label": name,
      className: triggerClassName,
      children: itemImage,
      onBlur: sharedTooltip?.hideTooltip,
      onFocus: ({ currentTarget }: FocusEvent<HTMLElement>) =>
        showSharedTooltip(currentTarget),
      onMouseEnter: ({ currentTarget }: MouseEvent<HTMLElement>) =>
        showSharedTooltip(currentTarget),
      onMouseLeave: sharedTooltip?.hideTooltip,
    },
  });

  if (sharedTooltip) return sharedTrigger;

  return (
    <TooltipProvider delay={100}>
      <Tooltip>
        <TooltipTrigger
          render={render}
          aria-label={name}
          className={triggerClassName}
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
