import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@lootlog/ui/components/tooltip";
import { t } from "@/i18n/messages";
import { findRequiredProfessions } from "@/lib/item-options";

/**
 * The professions the item requires as letter chips, in the alphabetical
 * order players say them, `BHT`, with their full names in a tooltip.
 */
export function ItemProfessions({ stat }: { stat: string }) {
  const professions = findRequiredProfessions(stat);

  if (professions.length === 0) return null;

  const letters = professions
    .map((profession) => t(`catalog.professionsShort.${profession}`))
    .sort();

  const names = professions
    .map((profession) => t(`filters.professions.${profession}`))
    .join(", ");

  return (
    <Tooltip>
      <TooltipTrigger
        render={<span role="img" />}
        aria-label={names}
        className="flex shrink-0 cursor-pointer gap-0.5"
      >
        {letters.map((letter) => (
          <span
            key={letter}
            aria-hidden="true"
            className="grid size-4 place-items-center rounded-sm bg-muted text-[0.625rem]/none font-semibold text-foreground/80"
          >
            {letter}
          </span>
        ))}
      </TooltipTrigger>
      <TooltipContent>{names}</TooltipContent>
    </Tooltip>
  );
}
