import { DETAIL_BAR_TOOLBAR_CELL_CLASS } from "@/components/common/detail-bar";
import { Button } from "@lootlog/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@lootlog/ui/components/dropdown-menu";
import { cn } from "cn";
import {
  BookText,
  Clock,
  MoreHorizontal,
  Pencil,
  RotateCcw,
  Sparkles,
  Star,
  Trash2,
} from "lucide-react";
import type { useEventHeader } from "../../use-event-header";

type EventHeaderActionsProps = Pick<
  ReturnType<typeof useEventHeader>,
  | "t"
  | "eventId"
  | "setRulesDialogOpen"
  | "setSummaryDialogOpen"
  | "isPinPending"
  | "eventIsPinned"
  | "pinActionLabel"
  | "isEventActive"
  | "togglePin"
  | "canManage"
  | "canDeleteEvent"
  | "navigateToEventEdit"
  | "openEventStatusDialog"
  | "setDeleteDialogOpen"
> & {
  event: NonNullable<ReturnType<typeof useEventHeader>["event"]>;
  isUpdatePending: boolean;
  isDeletePending: boolean;
};

/** The actions on the whole event: rules, summary, pin and management. */
export const EventHeaderActions = ({
  t,
  event,
  eventId,
  setRulesDialogOpen,
  setSummaryDialogOpen,
  isPinPending,
  eventIsPinned,
  pinActionLabel,
  isEventActive,
  togglePin,
  canManage,
  canDeleteEvent,
  navigateToEventEdit,
  openEventStatusDialog,
  setDeleteDialogOpen,
  isUpdatePending,
  isDeletePending,
}: EventHeaderActionsProps) => (
  <>
    <Button
      size="lg"
      variant="chip"
      className={DETAIL_BAR_TOOLBAR_CELL_CLASS}
      aria-label={t("events.rulesDialog.trigger")}
      onClick={() => setRulesDialogOpen(true)}
    >
      <BookText className="size-4" />
      <span className="@max-[36rem]/detail-bar:hidden">
        {t("events.rulesDialog.trigger")}
      </span>
      <span className="hidden @max-[36rem]/detail-bar:inline">
        {t("events.header.rulesShort")}
      </span>
    </Button>
    <Button
      size="lg"
      variant="chip"
      className={DETAIL_BAR_TOOLBAR_CELL_CLASS}
      aria-label={t("events.summaryDialog.trigger")}
      onClick={() => setSummaryDialogOpen(true)}
    >
      <Sparkles className="size-4" />
      <span className="@max-[36rem]/detail-bar:hidden">
        {t("events.summaryDialog.trigger")}
      </span>
      <span className="hidden @max-[36rem]/detail-bar:inline">
        {t("events.header.summaryShort")}
      </span>
    </Button>
    <Button
      size="lg"
      variant="chip"
      className={DETAIL_BAR_TOOLBAR_CELL_CLASS}
      loading={isPinPending(event.id)}
      aria-pressed={eventIsPinned}
      data-active={eventIsPinned || undefined}
      disabled={!eventId || !isEventActive || isPinPending(event.id)}
      title={pinActionLabel}
      onClick={() => togglePin(event)}
    >
      <Star
        className={cn(
          "size-4",
          eventIsPinned && "fill-current text-yellow-500",
        )}
      />
      {/* Why pinning is off, for an event that is not active, is in the title. */}
      {t(eventIsPinned ? "events.unpinEvent" : "events.pinEvent")}
    </Button>
    {canManage && (
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              size="icon-lg"
              variant="chip"
              className={DETAIL_BAR_TOOLBAR_CELL_CLASS}
              aria-label={t("events.header.manage")}
            >
              <MoreHorizontal className="size-4" />
              <span className="hidden @max-[36rem]/detail-bar:inline">
                {t("events.header.manageShort")}
              </span>
            </Button>
          }
        />
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onClick={navigateToEventEdit}>
            <Pencil className="size-4" />
            {t("events.editButton")}
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={isUpdatePending}
            onClick={openEventStatusDialog}
          >
            {isEventActive ? (
              <Clock className="size-4" />
            ) : (
              <RotateCcw className="size-4" />
            )}
            {isEventActive ? t("events.end") : t("events.resume")}
          </DropdownMenuItem>
          {canDeleteEvent && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                disabled={isDeletePending}
                onClick={() => setDeleteDialogOpen(true)}
              >
                <Trash2 className="size-4" />
                {t("events.delete")}
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    )}
  </>
);
