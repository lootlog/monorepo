import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@lootlog/ui/components/tooltip";
import { CalendarDays } from "lucide-react";
import { t } from "@/i18n/messages";
import { latestEventOf } from "@/lib/item-events";

export function ItemEvent({ stat }: { stat: string }) {
  const event = latestEventOf(stat);

  if (!event) return null;

  const label = t("catalog.eventItem", { event });

  return (
    <Tooltip>
      <TooltipTrigger
        render={<span role="img" />}
        aria-label={label}
        className="flex shrink-0 cursor-pointer text-fuchsia-400"
      >
        <CalendarDays aria-hidden="true" className="size-3.5" />
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
