import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@lootlog/ui/components/avatar";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@lootlog/ui/components/context-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@lootlog/ui/components/tooltip";
import { Ban, MessageSquareText, Trash2 } from "lucide-react";
import { getDiscordAvatarUrl } from "@/utils/get-avatar-url";
import type { GuildMember } from "@/hooks/api/members/use-guild-member";
import type { ReservationSegment } from "./types";
import {
  formatSegmentTime,
  formatDateWithTime,
  shouldShowEndDateOnFirstSegment,
} from "./utils";
import { DAYS, HOURS, LABEL_COLUMN_WIDTH } from "./constants";
import { Fragment } from "react";

type ReservationSegmentCardProps = {
  segment: ReservationSegment;
  membersByUserId: Map<string, GuildMember>;
  currentUserId?: string;
  canModerateReservations: boolean;
  isDeleting: boolean;
  onDeleteReservation: (
    reservationRecordId: number,
    action: "cancel" | "remove",
  ) => void;
};

export const ReservationSegmentCard: React.FC<ReservationSegmentCardProps> = ({
  segment,
  membersByUserId,
  currentUserId,
  canModerateReservations,
  isDeleting,
  onDeleteReservation,
}) => {
  const member = membersByUserId.get(segment.reservation.createdBy);
  const memberName = member?.name ?? segment.reservation.createdBy;
  const avatarUrl = getDiscordAvatarUrl(member?.userId, member?.avatar, 64);
  const fallbackInitial = memberName?.[0]?.toUpperCase() ?? "?";

  const canCancelReservation = segment.reservation.createdBy === currentUserId;
  const canRemoveReservation = canModerateReservations;
  const showContextMenu = canCancelReservation || canRemoveReservation;

  const displayStartLabel = formatSegmentTime(
    segment.reservation.fromDate,
    segment.segmentStart,
  );
  const baseEndReference = shouldShowEndDateOnFirstSegment(segment)
    ? segment.reservation.fromDate
    : segment.segmentEnd;
  const displayEndLabel = formatSegmentTime(
    segment.reservation.toDate,
    baseEndReference,
  );
  const createdLabel = formatDateWithTime(segment.reservation.createdDate);
  const trimmedComment = segment.reservation.comment?.trim();
  const hasComment = Boolean(trimmedComment?.length);
  const allowsInteraction = showContextMenu || hasComment;

  // Adaptive display - hide less important info for short reservations
  const isShortReservation = segment.durationHours < 1;
  const isVeryShortReservation = segment.durationHours < 0.75;

  const dayWidthExpr = `(100% - ${LABEL_COLUMN_WIDTH}px) / ${DAYS.length}`;
  const leftExpression = `calc(${LABEL_COLUMN_WIDTH}px + (${segment.dayIdx} * ${dayWidthExpr}) + 3px)`;
  const widthExpression = `calc(${dayWidthExpr} - 6px)`;
  const topPercent = Math.max(
    0,
    Math.min(100, (segment.startHour / HOURS.length) * 100),
  );
  const heightPercent = Math.max(
    1,
    Math.min(100, (segment.durationHours / HOURS.length) * 100),
  );

  const segmentElement = (
    <div
      className={`absolute z-10 overflow-hidden rounded-md border border-primary bg-primary/20 text-[10px] font-medium text-foreground hover:bg-primary/30 transition-colors shadow-sm cursor-pointer ${allowsInteraction ? "pointer-events-auto" : "pointer-events-auto"}`}
      style={{
        left: leftExpression,
        width: widthExpression,
        top: `calc(${topPercent}% + 1px)`,
        height: `calc(${heightPercent}% - 2px)`,
      }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div
        className={`relative flex h-full flex-col justify-center gap-1 ${isShortReservation ? "" : isVeryShortReservation ? "p-1 pr-8" : "p-2 pr-10"}`}
      >
        {isShortReservation ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <div
                className={`flex h-full items-center gap-2 w-full ${isVeryShortReservation ? "p-1 pr-8" : "p-2 pr-10"}`}
              >
                <Avatar
                  className={`pointer-events-none ${isVeryShortReservation ? "size-5" : "size-6"}`}
                >
                  <AvatarImage src={avatarUrl} alt={memberName} />
                  <AvatarFallback>{fallbackInitial}</AvatarFallback>
                </Avatar>
                <span
                  className={`font-semibold leading-tight text-nowrap truncate ${isVeryShortReservation ? "text-[9px]" : "text-[10px]"}`}
                >
                  {memberName}
                </span>
              </div>
            </TooltipTrigger>
            <TooltipContent
              side="top"
              sideOffset={12}
              className="flex flex-col gap-1 text-xs"
            >
              <div className="font-semibold">{memberName}</div>
              <div>
                {displayStartLabel} - {displayEndLabel}
              </div>
              {hasComment && trimmedComment && (
                <div className="italic text-muted-foreground">
                  {trimmedComment}
                </div>
              )}
              <div className="text-[10px] text-muted-foreground">
                Dodano {createdLabel}
              </div>
            </TooltipContent>
          </Tooltip>
        ) : (
          <>
            <div className="flex items-center gap-2">
              <Avatar
                className={`pointer-events-none ${isVeryShortReservation ? "size-5" : "size-6"}`}
              >
                <AvatarImage src={avatarUrl} alt={memberName} />
                <AvatarFallback>{fallbackInitial}</AvatarFallback>
              </Avatar>
              <span
                className={`font-semibold leading-tight text-nowrap ${isVeryShortReservation ? "text-[9px]" : "text-[10px]"}`}
              >
                {memberName}
              </span>
            </div>

            {hasComment && trimmedComment && !isVeryShortReservation && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="absolute top-1 left-1 flex items-center gap-1 rounded bg-transparent px-1.5 py-0.5 text-[9px] font-semibold text-foreground">
                    <MessageSquareText className="h-3 w-3" aria-hidden="true" />
                    {!isShortReservation && "Komentarz"}
                  </span>
                </TooltipTrigger>
                <TooltipContent
                  side="top"
                  align="start"
                  className="max-w-xs break-words text-xs"
                >
                  {trimmedComment}
                </TooltipContent>
              </Tooltip>
            )}

            <span
              className={`absolute top-1 right-1 rounded px-1.5 py-0.5 font-semibold text-foreground ${isVeryShortReservation ? "text-[8px]" : "text-[9px]"}`}
            >
              {displayStartLabel}
            </span>
            <span
              className={`absolute bottom-1 right-1 rounded px-1.5 py-0.5 font-semibold text-foreground ${isVeryShortReservation ? "text-[8px]" : "text-[9px]"}`}
            >
              {displayEndLabel}
            </span>

            {!isShortReservation && (
              <span className="absolute bottom-1 left-1 rounded px-1.5 py-0.5 text-[9px] font-semibold text-foreground">
                Dodano {createdLabel}
              </span>
            )}
          </>
        )}
      </div>
    </div>
  );

  if (showContextMenu) {
    return (
      <ContextMenu>
        <ContextMenuTrigger asChild>{segmentElement}</ContextMenuTrigger>
        <ContextMenuContent className="min-w-[12rem]">
          {canCancelReservation && (
            <ContextMenuItem
              className="group gap-2 data-[highlighted]:bg-muted data-[highlighted]:text-foreground"
              disabled={isDeleting}
              onSelect={() => {
                onDeleteReservation(segment.reservation.id, "cancel");
              }}
            >
              <Ban className="h-4 w-4 text-muted-foreground transition-colors group-data-[highlighted]:text-foreground" />
              Anuluj rezerwację
            </ContextMenuItem>
          )}
          {canCancelReservation && canRemoveReservation && (
            <ContextMenuSeparator />
          )}
          {canRemoveReservation && (
            <ContextMenuItem
              className="gap-2 text-destructive focus:bg-destructive/10 focus:text-destructive data-[highlighted]:bg-destructive/10 data-[highlighted]:text-destructive"
              disabled={isDeleting}
              onSelect={() => {
                onDeleteReservation(segment.reservation.id, "remove");
              }}
            >
              <Trash2 className="h-4 w-4 text-destructive" />
              Usuń rezerwację
            </ContextMenuItem>
          )}
        </ContextMenuContent>
      </ContextMenu>
    );
  }

  return <Fragment>{segmentElement}</Fragment>;
};
