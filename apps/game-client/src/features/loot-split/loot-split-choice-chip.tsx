import type { LootSplitChoice } from "@lootlog/schema/loot-split";
import { cn } from "cn";
import type { FC } from "react";
import { useTranslation } from "react-i18next";

/** The game's loot window colours: "nie chcę" red, "chcę" green, "bardzo chcę" orange. */
const CHOICE_CLASS_NAMES: Record<LootSplitChoice, string> = {
  0: "ll:bg-red-700/70 ll:text-white/85",
  1: "ll:bg-emerald-600/85 ll:text-white",
  2: "ll:bg-orange-500 ll:text-black",
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
        "ll:inline-flex ll:size-5 ll:items-center ll:justify-center ll:rounded-[4px] ll:text-[10px] ll:font-bold ll:leading-none",
        choice === undefined
          ? "ll:border ll:border-dashed ll:border-white/25 ll:text-white/40"
          : CHOICE_CLASS_NAMES[choice],
        canPickMust && "ll:ring-1 ll:ring-orange-400/70",
      )}
    >
      {t(`choiceShort.${choice ?? "unknown"}`)}
    </span>
  );
};
