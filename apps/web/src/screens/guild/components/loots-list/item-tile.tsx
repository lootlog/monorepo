import { parseItemStats } from "@/utils/item-tips/parse-item-stats";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Item, ItemRarity } from "@/hooks/api/use-loots";
import { FC } from "react";
import { Trans, useTranslation } from "react-i18next";
import { ItemImage } from "@/screens/guild/components/loots-list/item-image";
import { cn } from "@/utils/cn";
import { mapStatsToDisplayValues } from "@/utils/item-tips/map-stats-to-display-values";

type ItemTileProps = {
  item: Item;
  color?: string;
  shareIndex?: number;
  shareNickname?: string;
};

export const ItemTile: FC<ItemTileProps> = ({
  item: { name, rarity, icon, stat },
  color = "",
  shareIndex,
  shareNickname,
}) => {
  const { t } = useTranslation();
  const rarityCn = cn("text-xs font-semibold", {
    "text-gray-500": rarity === ItemRarity.COMMON,
    "text-sm": rarity === ItemRarity.UPGRADED,
    "text-amber-700": rarity === ItemRarity.LEGENDARY,
    "text-blue-500": rarity === ItemRarity.HEROIC,
    "text-amber-300": rarity === ItemRarity.UNIQUE,
  });

  const renderStats = () => {
    const stats = parseItemStats(stat);
    const values = mapStatsToDisplayValues(stats);

    return Object.entries(values).map(([key, value], i) => {
      if (value.length === 0) {
        return null;
      }

      return (
        <div
          key={key}
          className={cn("pb-2 gap-0.5 flex flex-col", {
            "border-b": i < Object.entries(values).length - 1,
          })}
        >
          {value.map((v) => {
            const values =
              Array.isArray(v.value) && !v.translateKey
                ? v.value.reduce((acc: Record<string, string>, val, idx) => {
                    acc[`value${idx + 1}`] = val;

                    return acc;
                  }, {})
                : {
                    value:
                      v.translateKey && Array.isArray(v.value)
                        ? v.value
                            .map((k) => t(`${v.translateKey}.${k}`))
                            .join(", ")
                        : v.value,
                  };

            return (
              <div key={v.key} className="text-xs whitespace-pre-line">
                <Trans
                  i18nKey={`itemStats.${v.key}`}
                  values={values}
                  components={{
                    value: <span className="font-bold text-orange-500" />,
                    description: <div className="text-center text-gray-400" />,
                    legbon: <span className="text-green-500" />,
                  }}
                >
                  {v.value}
                </Trans>
              </div>
            );
          })}
        </div>
      );
    });
  };

  return (
    <TooltipProvider>
      <Tooltip delayDuration={100}>
        <TooltipTrigger>
          <ItemImage
            rarity={rarity}
            icon={icon}
            color={color}
            shareIndex={shareIndex}
          />
        </TooltipTrigger>
        <TooltipContent className="w-80 p-3 pb-0">
          <div className="flex flex-row border-b items-center justify-between pb-2">
            <div className="flex flex-col justify-between">
              <p className="font-heading mt-12 scroll-m-20 mr-8 text-md font-semibold tracking-tight first:mt-0">
                {name}
              </p>
              <p className={rarityCn}>{t(`itemRarity.${rarity}`)}</p>
            </div>
            <ItemImage rarity={rarity} icon={icon} color={color} />
          </div>
          <div className="pt-2 text-xs flex flex-col gap-2">
            {renderStats()}
          </div>
          {shareNickname && (
            <div className="text-xs py-2">
              Zdobyto przez:{" "}
              <span className="font-semibold">{shareNickname}</span>
            </div>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
