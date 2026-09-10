const isPinActionDisabled = (
  eventId: string | undefined,
  isEventActive: boolean,
  isPending: (eventId: string) => boolean,
) => !eventId || !isEventActive || isPending(eventId);

import { PageHeader } from "@/components/common/page-header";
import { SectionCardFooter } from "@/components/common/section-card/section-card-footer";
import { Badge } from "@lootlog/ui/components/badge";
import { Button } from "@lootlog/ui/components/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@lootlog/ui/components/tooltip";
import { Link } from "@tanstack/react-router";
import { cn } from "cn";
import {
  BookText,
  CalendarDays,
  Clock,
  Crosshair,
  Globe2,
  Sparkles,
  Star,
  Trophy,
} from "lucide-react";
import type { useEventDetail } from "./use-event-detail";

type Props = Pick<
  ReturnType<typeof useEventDetail>,
  | "eventStatusVariant"
  | "eventStatusLabel"
  | "t"
  | "eventDateRangeLabel"
  | "isPinPending"
  | "eventIsPinned"
  | "pinActionLabel"
  | "eventId"
  | "isEventActive"
  | "togglePin"
  | "queryGuildId"
  | "queryEventId"
  | "setSummaryDialogOpen"
  | "setRulesDialogOpen"
> & { event: NonNullable<ReturnType<typeof useEventDetail>["event"]> };

export const EventDetailHeader = ({
  event,
  eventStatusVariant,
  eventStatusLabel,
  t,
  eventDateRangeLabel,
  isPinPending,
  eventIsPinned,
  pinActionLabel,
  eventId,
  isEventActive,
  togglePin,
  queryGuildId,
  queryEventId,
  setSummaryDialogOpen,
  setRulesDialogOpen,
}: Props) => (
  <>
    <PageHeader
      icon={Trophy}
      title={event.name}
      status={
        <Badge variant={eventStatusVariant} className="h-5 px-2 text-[11px]">
          {eventStatusLabel}
        </Badge>
      }
      metadata={
        <>
          <span className="inline-flex items-center gap-1.5">
            <Globe2 className="size-3.5" />
            {event.world.charAt(0).toUpperCase() + event.world.slice(1)}
          </span>

          <Tooltip>
            <TooltipTrigger
              render={
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 rounded-sm transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                >
                  <Clock className="size-3.5" />
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

          <span className="inline-flex min-w-0 items-center gap-1.5">
            <CalendarDays className="size-3.5 shrink-0" />
            <span>{eventDateRangeLabel}</span>
          </span>
        </>
      }
      actions={
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                type="button"
                size="sm"
                variant="outline"
                loading={isPinPending(event.id)}
                icon=<Star
                  className={cn("size-4", eventIsPinned && "fill-current")}
                />
                aria-label={pinActionLabel}
                title={pinActionLabel}
                aria-pressed={eventIsPinned}
                disabled={isPinActionDisabled(
                  eventId,
                  isEventActive,
                  isPinPending,
                )}
                className={cn(
                  "h-9 shrink-0 gap-2 px-3",
                  eventIsPinned
                    ? "border-yellow-500/35 bg-yellow-500/10 text-yellow-500 hover:border-yellow-500/50 hover:bg-yellow-500/15 hover:text-yellow-500"
                    : "border-primary/30 bg-primary/5 text-primary hover:border-primary/50 hover:bg-primary/10 hover:text-primary",
                )}
                onClick={() => {
                  if (eventId) {
                    togglePin(event);
                  }
                }}
              >
                <span className="hidden sm:inline">{pinActionLabel}</span>
              </Button>
            }
          />
          <TooltipContent>{pinActionLabel}</TooltipContent>
        </Tooltip>
      }
    >
      <SectionCardFooter className="grid gap-1 p-1.5 sm:grid-cols-3">
        <Button
          size="sm"
          variant="ghost"
          className="w-full min-w-0 justify-center text-muted-foreground hover:text-foreground"
          render={
            <Link
              to="/$guildId/events/$eventId/coordination"
              params={{ guildId: queryGuildId, eventId: queryEventId }}
            >
              <Crosshair className="size-3.5" />
              {t("events.coordination.trigger")}
            </Link>
          }
          nativeButton={false}
        />
        <Button
          size="sm"
          variant="ghost"
          className="w-full min-w-0 justify-center text-muted-foreground hover:text-foreground"
          onClick={() => setSummaryDialogOpen(true)}
        >
          <Sparkles className="size-3.5" />
          {t("events.summaryDialog.trigger")}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="w-full min-w-0 justify-center text-muted-foreground hover:text-foreground"
          onClick={() => setRulesDialogOpen(true)}
        >
          <BookText className="size-3.5" />
          {t("events.rulesDialog.trigger")}
        </Button>
      </SectionCardFooter>
    </PageHeader>
  </>
);
