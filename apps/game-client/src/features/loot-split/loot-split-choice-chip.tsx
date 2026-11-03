import type { LootSplitChoice } from "@lootlog/schema/loot-split";
import { cn } from "cn";
import { Check, CheckCheck, X } from "lucide-react";
import type { FC } from "react";

/**
 * The game's loot buttons at cell size: a red "Nie chcę" ✕, a green "Chcę"
 * ✓ and a green "Bardzo chcę" ✓✓ with the yellow rim the game gives a
 * chosen button. Opaque gradients keep each chip readable over whatever the
 * translucent window shows through.
 */
const CHOICES = {
  0: {
    icon: X,
    className:
      "ll:from-[#300b0b] ll:to-[#831f1f] ll:shadow-[inset_0_0_0_1px_rgb(218_97_97/0.45)]",
  },
  1: {
    icon: Check,
    className:
      "ll:from-[#12210d] ll:to-[#396b29] ll:shadow-[inset_0_0_0_1px_rgb(126_197_104/0.5)]",
  },
  2: {
    icon: CheckCheck,
    className:
      "ll:from-[#12210d] ll:to-[#396b29] ll:shadow-[inset_0_0_0_1px_rgb(255_240_0/0.75)]",
  },
} satisfies Record<
  LootSplitChoice,
  { icon: FC<{ className?: string }>; className: string }
>;

type LootSplitChoiceChipProps = {
  choice: LootSplitChoice | undefined;
  label: string;
};

export const LootSplitChoiceChip: FC<LootSplitChoiceChipProps> = ({
  choice,
  label,
}) => {
  if (choice === undefined)
    return (
      <span
        role="img"
        aria-label={label}
        title={label}
        className="ll:inline-flex ll:h-5 ll:w-6 ll:items-center ll:justify-center ll:text-white/30"
      >
        –
      </span>
    );

  const { icon: Icon, className } = CHOICES[choice];

  return (
    <span
      role="img"
      aria-label={label}
      title={label}
      className={cn(
        "ll:inline-flex ll:h-5 ll:w-6 ll:items-center ll:justify-center ll:rounded-[5px] ll:border ll:border-[#0c0d0d] ll:bg-linear-to-t ll:text-[#e6d6bf]",
        className,
      )}
    >
      <Icon
        aria-hidden
        strokeWidth={3}
        className="ll:size-3.5 ll:drop-shadow-[0_1px_0_rgb(0_0_0/0.8)]"
      />
    </span>
  );
};
