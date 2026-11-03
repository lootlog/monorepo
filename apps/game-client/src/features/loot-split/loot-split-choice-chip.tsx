import type { LootSplitChoice } from "@lootlog/schema/loot-split";
import { cn } from "cn";
import type { FC } from "react";
import { useTranslation } from "react-i18next";

/**
 * Dark opaque fills with a light letter in the same hue, so each chip keeps
 * its contrast over whatever the translucent window shows through. "Bardzo
 * chcę" is violet rather than the game's orange, apart from the amber of a
 * player still choosing.
 */
const CHOICE_CLASS_NAMES: Record<LootSplitChoice, string> = {
  0: "ll:border-red-400/40 ll:bg-red-950 ll:text-red-300",
  1: "ll:border-emerald-400/40 ll:bg-emerald-950 ll:text-emerald-300",
  2: "ll:border-violet-400/50 ll:bg-violet-950 ll:text-violet-300",
};

type LootSplitChoiceChipProps = {
  choice: LootSplitChoice | undefined;
  /** Rings the chip when this player may pick "bardzo chcę" for the item. */
  canPickMust: boolean;
  label: string;
};

export const LootSplitChoiceChip: FC<LootSplitChoiceChipProps> = ({
  choice,
  canPickMust,
  label,
}) => {
  const { t } = useTranslation("lootSplit");

  return (
    <span
      role="img"
      aria-label={label}
      title={label}
      className={cn(
        "ll:inline-flex ll:size-5 ll:items-center ll:justify-center ll:rounded-[4px] ll:border ll:text-[10px] ll:font-bold ll:leading-none",
        choice === undefined
          ? "ll:border-dashed ll:border-white/25 ll:text-white/40"
          : CHOICE_CLASS_NAMES[choice],
        canPickMust &&
          "ll:ring-1 ll:ring-violet-400 ll:ring-offset-1 ll:ring-offset-transparent",
      )}
    >
      {t(`choiceShort.${choice ?? "unknown"}`)}
    </span>
  );
};
