import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@lootlog/ui/components/tooltip";
import { t } from "@/i18n/messages";

const GRIPS = [
  "ONE_HAND_WEAPON",
  "ONE_AND_HALF_HAND_WEAPON",
  "TWO_HAND_WEAPON",
] as const;

type Grip = (typeof GRIPS)[number];

const isGrip = (type: string | null): type is Grip =>
  GRIPS.some((grip) => grip === type);

/**
 * How many hands a melee weapon takes as a short chip, `1H`, `1,5H` or `2H`,
 * with the weapon type named in a tooltip; nothing for other items.
 */
export function ItemGrip({ type }: { type: string | null }) {
  if (!isGrip(type)) return null;

  const name = t(`itemType.${type}`);

  return (
    <Tooltip>
      <TooltipTrigger
        render={<span role="img" />}
        aria-label={name}
        className="flex shrink-0 cursor-pointer"
      >
        <span
          aria-hidden="true"
          className="grid h-4 place-items-center rounded-full border border-violet-400/50 px-1.5 text-[0.625rem]/none font-semibold text-violet-300"
        >
          {t(`catalog.gripShort.${type}`)}
        </span>
      </TooltipTrigger>
      <TooltipContent>{name}</TooltipContent>
    </Tooltip>
  );
}
