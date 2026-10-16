import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@lootlog/ui/components/tooltip";
import { cn } from "cn";
import { upperFirst } from "es-toolkit";
import type { useEventHeader } from "../../use-event-header";
import { EventHeaderFact } from "./event-header-fact";
import { EventHeaderFacts } from "./event-header-facts";

type EventHeaderMetaProps = Pick<
  ReturnType<typeof useEventHeader>,
  "t" | "eventStatusVariant" | "eventStatusLabel" | "eventDateRangeLabel"
> & {
  event: NonNullable<ReturnType<typeof useEventHeader>["event"]>;
};

const STATUS_TEXT_CLASS = {
  live: "text-signal-live",
  outline: "text-foreground",
  secondary: "text-muted-foreground",
} as const;

/** The event's status, world, assignment window and dates as labelled facts. */
export const EventHeaderMeta = ({
  t,
  event,
  eventStatusVariant,
  eventStatusLabel,
  eventDateRangeLabel,
}: EventHeaderMetaProps) => (
  <EventHeaderFacts>
    <EventHeaderFact label={t("events.header.status")}>
      <span
        className={cn(
          "flex items-center gap-1.5",
          STATUS_TEXT_CLASS[eventStatusVariant],
        )}
      >
        <span aria-hidden className="size-2 shrink-0 rounded-full bg-current" />
        {eventStatusLabel}
      </span>
    </EventHeaderFact>
    <EventHeaderFact label={t("events.header.world")}>
      {upperFirst(event.world)}
    </EventHeaderFact>
    <EventHeaderFact label={t("events.header.assignmentTimeout")}>
      <Tooltip>
        <TooltipTrigger
          render={
            <button
              type="button"
              className="truncate rounded-sm underline decoration-muted-foreground/60 decoration-dotted underline-offset-4 outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
            >
              {t("events.header.assignmentTimeoutValue", {
                minutes: event.assignmentTimeoutMinutes ?? 5,
              })}
            </button>
          }
        />
        <TooltipContent>
          <p>{t("events.header.assignmentTimeoutTooltip")}</p>
        </TooltipContent>
      </Tooltip>
    </EventHeaderFact>
    <EventHeaderFact label={t("events.header.dates")}>
      {eventDateRangeLabel}
    </EventHeaderFact>
  </EventHeaderFacts>
);
