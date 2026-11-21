import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@lootlog/ui/components/tooltip";
import { t } from "@/i18n/messages";
import { findRequiredProfessions } from "@/lib/item-options";

/**
 * The professions the item requires as one chip of letters, in the
 * alphabetical order players say them, `BHT`, with their full names in a
 * tooltip.
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
        className="flex shrink-0 cursor-pointer"
      >
        <span
          aria-hidden="true"
          className="flex h-4 items-center gap-0.5 rounded-sm bg-foreground/10 px-1.5 text-[0.6875rem]/none font-semibold text-foreground"
        >
          {letters.map((letter) => (
            <span key={letter}>{letter}</span>
          ))}
        </span>
      </TooltipTrigger>
      <TooltipContent>{names}</TooltipContent>
    </Tooltip>
  );
}
