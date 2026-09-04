import { ItemImage, ItemRarity } from "@lootlog/ui/components/item-image";
import {
  mapStatsToDisplaySections,
  parseItemStats,
  type ItemDisplayValue,
} from "@lootlog/ui/components/item-stat-utils";
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
  typePrefix: string;
};

export type ItemTileProps = {
  color?: string;
  item: GameItem;
  labels: ItemTileLabels;
  renderStat?: (displayValue: ItemDisplayValue) => ReactNode;
  shareIndex?: number;
  shareNickname?: string;
};

const formatFallbackValue = (
  rawValue: string | string[] | number | boolean | undefined,
) => {
  if (Array.isArray(rawValue)) {
    return rawValue.join(", ");
  }

  return String(rawValue ?? "");
};

const fallbackRenderStat = (displayValue: ItemDisplayValue) => {
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

const ItemTileTooltipBody: FC<
  Required<Pick<ItemTileProps, "color" | "labels" | "renderStat">> & {
    icon: string;
    name: string;
    rarity: ItemRarity;
    shareNickname?: string;
    stat: string;
    type: string;
  }
> = ({
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
  const rarityClassName = cn("text-xs font-semibold", {
    "text-amber-300": rarity === ItemRarity.UNIQUE,
    "text-blue-500": rarity === ItemRarity.HEROIC,
    "text-muted-foreground": rarity === ItemRarity.COMMON,
    "text-orange-600": rarity === ItemRarity.LEGENDARY,
    "text-primary text-sm": rarity === ItemRarity.UPGRADED,
  });

  const statSections = mapStatsToDisplaySections(parseItemStats(stat));

  return (
    <>
      <div className="flex flex-row items-center justify-between border-b border-border/50 pb-2">
        <div className="flex flex-col justify-between">
          <p className="font-heading mr-8 mt-0 text-md font-semibold tracking-tight text-foreground">
            {name}
          </p>
          <p className={rarityClassName}>{labels.rarity[rarity] ?? rarity}</p>
          <p className="text-xs text-muted-foreground">
            {labels.typePrefix}
            {labels.type[type] ?? type}
          </p>
        </div>
        <ItemImage color={color} icon={icon} rarity={rarity} />
      </div>
      <div className="flex flex-col gap-2 pt-2 text-xs">
        {statSections.map(({ index: sectionIndex, values }, index) => {
          return (
            <div
              key={sectionIndex}
              className={cn("flex flex-col gap-0.5 pb-2", {
                "border-b border-border/50": index < statSections.length - 1,
              })}
            >
              {values.map((displayValue) => (
                <div
                  key={`${displayValue.key}-${formatFallbackValue(
                    displayValue.value,
                  )}`}
                  className="whitespace-pre-line text-xs text-foreground"
                >
                  {renderStat(displayValue)}
                </div>
              ))}
            </div>
          );
        })}
      </div>
      {shareNickname && labels.obtainedBy ? (
        <div className="py-2 text-xs text-muted-foreground">
          {labels.obtainedBy}{" "}
          <span className="font-semibold text-foreground">{shareNickname}</span>
        </div>
      ) : null}
    </>
  );
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
    "w-80 p-3 pb-0 bg-popover/95 backdrop-blur-md",
    {
      "border border-border/50": normalizedRarity === ItemRarity.COMMON,
      "border-2 border-amber-300/80": normalizedRarity === ItemRarity.UNIQUE,
      "border-2 border-blue-500/80": normalizedRarity === ItemRarity.HEROIC,
      "border-2 border-orange-600/80":
        normalizedRarity === ItemRarity.LEGENDARY,
      "border-2 border-primary/40": normalizedRarity === ItemRarity.UPGRADED,
    },
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
    <ItemTileTooltipBody
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
          render={<button className={triggerClassName} type="button" />}
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
