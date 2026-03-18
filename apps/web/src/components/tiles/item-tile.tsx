import { useSharedTooltip } from "@/components/shared-tooltip/shared-tooltip-provider";
import { ItemImage } from "@/components/tiles/item-image";
import { ItemRarity, type Item } from "@/hooks/api/loots/use-loots";
import { cn } from "@/utils/cn";
import { mapStatsToDisplayValues } from "@/utils/item-tips/map-stats-to-display-values";
import { parseItemStats } from "@/utils/item-tips/parse-item-stats";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@lootlog/ui/components/tooltip";
import type { FC } from "react";
import { Trans, useTranslation } from "react-i18next";

type ItemTileProps = {
  item: Item;
  color?: string;
  shareIndex?: number;
  shareNickname?: string;
};

type ItemTileTooltipBodyProps = {
  name: string;
  rarity: ItemRarity;
  icon: string;
  stat: string;
  type: string;
  color: string;
  shareNickname?: string;
};

const ItemTileTooltipBody: FC<ItemTileTooltipBodyProps> = ({
  name,
  rarity,
  icon,
  stat,
  type,
  color,
  shareNickname,
}) => {
  const { t } = useTranslation();
  const rarityCn = cn("text-xs font-semibold", {
    "text-muted-foreground": rarity === ItemRarity.COMMON,
    "text-sm text-primary": rarity === ItemRarity.UPGRADED,
    "text-orange-600": rarity === ItemRarity.LEGENDARY,
    "text-blue-500": rarity === ItemRarity.HEROIC,
    "text-amber-300": rarity === ItemRarity.UNIQUE,
  });

  const renderStats = () => {
    const stats = parseItemStats(stat);
    const values = mapStatsToDisplayValues(stats);
    const statGroups = Object.entries(values);

    return statGroups.map(([key, value], index) => {
      if (value.length === 0) {
        return null;
      }

      return (
        <div
          key={key}
          className={cn("pb-2 gap-0.5 flex flex-col", {
            "border-b border-border/50": index < statGroups.length - 1,
          })}
        >
          {value.map((displayValue) => {
            const formatValue = (
              rawValue: string | string[] | number | boolean | undefined,
            ) => {
              if (displayValue.key === "gold" && typeof rawValue === "string") {
                return rawValue.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
              }

              return rawValue;
            };

            const translatedValues =
              Array.isArray(displayValue.value) && !displayValue.translateKey
                ? displayValue.value.reduce(
                    (acc: Record<string, string>, rawValue, valueIndex) => {
                      acc[`value${valueIndex + 1}`] = formatValue(
                        rawValue,
                      ) as string;

                      return acc;
                    },
                    {},
                  )
                : {
                    value:
                      displayValue.translateKey &&
                      Array.isArray(displayValue.value)
                        ? displayValue.value
                            .map((translationKey) =>
                              t(
                                `${displayValue.translateKey}.${translationKey}`,
                              ),
                            )
                            .join(",\u00A0")
                        : formatValue(displayValue.value),
                  };

            return (
              <div key={displayValue.key} className="text-xs text-foreground">
                <Trans
                  i18nKey={`itemStats.${displayValue.key}`}
                  values={translatedValues}
                  components={{
                    value: <span className="font-bold text-primary" />,
                    description: (
                      <div className="text-center text-muted-foreground" />
                    ),
                    legbon: <span className="text-green-500" />,
                    gold: <span className="text-primary" />,
                  }}
                >
                  {displayValue.value}
                </Trans>
              </div>
            );
          })}
        </div>
      );
    });
  };

  return (
    <>
      <div className="flex flex-row border-b border-border/50 items-center justify-between pb-2">
        <div className="flex flex-col justify-between">
          <p className="font-heading mt-12 scroll:m-20 mr-8 text-md font-semibold tracking-tight first:mt-0 text-foreground">
            {name}
          </p>
          <p className={rarityCn}>{t(`itemRarity.${rarity}`)}</p>
          <p className="text-xs text-muted-foreground">
            {t("itemType.prefix")}
            {t(`itemType.${type}`)}
          </p>
        </div>
        <ItemImage rarity={rarity} icon={icon} color={color} />
      </div>
      <div className="pt-2 text-xs flex flex-col gap-2">{renderStats()}</div>
      {shareNickname && (
        <div className="text-xs py-2 text-muted-foreground">
          {t("loots.list.obtainedBy")}{" "}
          <span className="font-semibold text-foreground">{shareNickname}</span>
        </div>
      )}
    </>
  );
};

export const ItemTile: FC<ItemTileProps> = ({
  item: { name, rarity, icon, stat, type },
  color = "",
  shareIndex,
  shareNickname,
}) => {
  const sharedTooltip = useSharedTooltip();
  const triggerClassName = "w-fit appearance-none border-0 bg-transparent p-0";
  const tooltipBorderCn = cn("w-80 p-3 pb-0 bg-popover/95 backdrop-blur-md", {
    "border-2 border-orange-600/80": rarity === ItemRarity.LEGENDARY,
    "border-2 border-blue-500/80": rarity === ItemRarity.HEROIC,
    "border-2 border-amber-300/80": rarity === ItemRarity.UNIQUE,
    "border-2 border-primary/40": rarity === ItemRarity.UPGRADED,
    "border border-border/50": rarity === ItemRarity.COMMON,
  });

  const itemImage = (
    <ItemImage
      rarity={rarity}
      icon={icon}
      color={color}
      shareIndex={shareIndex}
    />
  );

  const tooltipContent = (
    <ItemTileTooltipBody
      name={name}
      rarity={rarity}
      icon={icon}
      stat={stat}
      type={type}
      color={color}
      shareNickname={shareNickname}
    />
  );

  if (sharedTooltip) {
    return (
      <button
        type="button"
        className={triggerClassName}
        onMouseEnter={({ currentTarget }) =>
          sharedTooltip.showTooltip(
            tooltipContent,
            currentTarget.getBoundingClientRect(),
            {
              contentClassName: tooltipBorderCn,
              triggerElement: currentTarget,
            },
          )
        }
        onMouseLeave={sharedTooltip.hideTooltip}
        onFocus={({ currentTarget }) =>
          sharedTooltip.showTooltip(
            tooltipContent,
            currentTarget.getBoundingClientRect(),
            {
              contentClassName: tooltipBorderCn,
              triggerElement: currentTarget,
            },
          )
        }
        onBlur={sharedTooltip.hideTooltip}
      >
        {itemImage}
      </button>
    );
  }

  return (
    <Tooltip delayDuration={100}>
      <TooltipTrigger asChild>
        <button type="button" className={triggerClassName}>
          {itemImage}
        </button>
      </TooltipTrigger>
      <TooltipContent className={tooltipBorderCn}>
        {tooltipContent}
      </TooltipContent>
    </Tooltip>
  );
};
