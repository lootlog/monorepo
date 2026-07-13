import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { EventModeResponseDtoEventsItem } from "@/lib/api/generated/main/model/event-mode-response-dto-events-item";
import { CloudOff } from "lucide-react";
import { useTranslation } from "react-i18next";

interface EventModeSelectorProps {
  events: EventModeResponseDtoEventsItem[];
  selectedEventId: string;
  isStale: boolean;
  lastUpdatedAt: number;
  onEventChange: (eventId: string) => void;
}

export const EventModeSelector = ({
  events,
  selectedEventId,
  isStale,
  lastUpdatedAt,
  onEventChange,
}: EventModeSelectorProps) => {
  const { t } = useTranslation("eventMode");
  const lastUpdatedTime = lastUpdatedAt
    ? new Date(lastUpdatedAt).toLocaleTimeString("pl-PL")
    : t("stale.unknownTime");
  const staleLabel = t("stale.description", { time: lastUpdatedTime });

  if (events.length <= 1 && !isStale) {
    return null;
  }

  return (
    <div className="ll:flex ll:items-center ll:gap-1" data-ll-draggable="false">
      {events.length > 1 ? (
        <Select value={selectedEventId} onValueChange={onEventChange}>
          <SelectTrigger
            aria-label={t("selector.label")}
            className="ll:h-5 ll:w-7 ll:border-white/15 ll:bg-black/35 ll:px-1 ll:text-[9px] ll:text-gray-200"
          >
            <SelectValue className="ll:sr-only" />
          </SelectTrigger>
          <SelectContent className="ll:min-w-52">
            {events.map((event) => (
              <SelectItem key={event.id} value={event.id}>
                {t("selector.option", {
                  event: event.name,
                  guild: event.guild.name,
                })}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : null}
      {isStale ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <CloudOff
              size={13}
              className="ll:text-orange-300/80"
              aria-label={staleLabel}
            />
          </TooltipTrigger>
          <TooltipContent>{staleLabel}</TooltipContent>
        </Tooltip>
      ) : null}
    </div>
  );
};
