import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@lootlog/ui/components/tooltip";
import { cn } from "cn";
import { useTranslation } from "react-i18next";
import type { NPC_RARITY_CONFIG } from "./npc-rarity-config";

type NpcRarityMarksProps = {
  rarities: typeof NPC_RARITY_CONFIG;
  side: "top" | "bottom";
};

/** The rarities collected for a monster, each named in a tooltip. */
export const NpcRarityMarks = ({ rarities, side }: NpcRarityMarksProps) => {
  const { t } = useTranslation();

  return (
    <TooltipProvider delay={100}>
      {rarities.map((rarity) => {
        const Icon = rarity.icon;

        return (
          <Tooltip key={rarity.key}>
            <TooltipTrigger
              render={
                <span
                  className={cn(
                    "inline-flex size-7 items-center justify-center rounded-md",
                    rarity.bgColor,
                  )}
                  aria-label={t(`itemRarity.${rarity.key}`)}
                >
                  <Icon className={cn("size-4", rarity.color)} aria-hidden />
                </span>
              }
            />
            <TooltipContent side={side}>
              <p className="text-sm font-semibold">
                {t(`itemRarity.${rarity.key}`)}
              </p>
            </TooltipContent>
          </Tooltip>
        );
      })}
    </TooltipProvider>
  );
};
