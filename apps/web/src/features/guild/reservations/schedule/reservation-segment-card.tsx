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
import type { MemberReferenceResponseDtoOutput as GuildMember } from "@/lib/api/generated/main/model";
import type { ReservationSegment } from "./types";
import {
  formatSegmentTime,
  formatDateWithTime,
  shouldShowEndDateOnFirstSegment,
} from "./utils";
import {
  HEADER_HEIGHT,
  MIN_ROW_HEIGHT,
  DAYS,
  LABEL_COLUMN_WIDTH,
} from "./constants";
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

  const isShortReservation = segment.durationHours < 1;
  const isVeryShortReservation = segment.durationHours < 0.75;

  const { dayIdx, startHour, durationHours } = segment;

  const topPx = HEADER_HEIGHT + startHour * MIN_ROW_HEIGHT;
  const heightPx = durationHours * MIN_ROW_HEIGHT;

  const dayWidthExpr = `(100% - ${LABEL_COLUMN_WIDTH}px) / ${DAYS.length}`;
  const leftExpression = `calc(${LABEL_COLUMN_WIDTH}px + (${dayIdx} * ${dayWidthExpr}))`;
  const widthExpression = `calc(${dayWidthExpr})`;

  const segmentElement = (
    <div
      className={`absolute z-10 overflow-hidden rounded-md border border-primary bg-primary/20 text-[10px] font-medium text-foreground hover:bg-primary/30 transition-colors shadow-sm cursor-pointer ${allowsInteraction ? "pointer-events-auto" : "pointer-events-auto"}`}
      style={{
        left: leftExpression,
        width: widthExpression,
        top: `calc(${topPx}px + 1px)`,
        height: `calc(${heightPx}px - 2px)`,
      }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      {isShortReservation ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex h-full items-center gap-2 w-full p-1">
              <Avatar className="pointer-events-none size-5 shrink-0">
                <AvatarImage src={avatarUrl} alt={memberName} />
                <AvatarFallback>{fallbackInitial}</AvatarFallback>
              </Avatar>
              <div className="flex flex-col min-w-0 flex-1">
                <span className="font-semibold leading-tight truncate text-[10px]">
                  {memberName}
                </span>
                {!isVeryShortReservation && (
                  <span className="text-[9px] text-muted-foreground truncate opacity-80">
                    {displayStartLabel} - {displayEndLabel}
                  </span>
                )}
              </div>
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
        <div className="flex flex-col h-full justify-between p-1.5 min-w-0">
          <div className="flex items-start justify-between w-full">
            <span className="text-[9px] font-semibold opacity-90 leading-none bg-background/40 px-1 rounded backdrop-blur-[1px]">
              {displayStartLabel}
            </span>

            {hasComment && trimmedComment && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <MessageSquareText
                    className="h-3 w-3 shrink-0 opacity-80"
                    aria-hidden="true"
                  />
                </TooltipTrigger>
                <TooltipContent
                  side="top"
                  align="end"
                  className="max-w-xs break-words text-xs"
                >
                  {trimmedComment}
                </TooltipContent>
              </Tooltip>
            )}
          </div>

          <div className="flex flex-col items-center justify-center gap-1 text-center min-h-0 flex-1 my-0.5">
            <Avatar className="pointer-events-none size-7 shrink-0 shadow-sm border border-border/20">
              <AvatarImage src={avatarUrl} alt={memberName} />
              <AvatarFallback>{fallbackInitial}</AvatarFallback>
            </Avatar>
            <span className="font-semibold leading-tight line-clamp-2 text-wrap break-words w-full text-[10px]">
              {memberName}
            </span>
          </div>

          <div className="flex flex-col items-end w-full gap-0.5">
            <span className="text-[9px] font-semibold opacity-90 leading-none bg-background/40 px-1 rounded backdrop-blur-[1px]">
              {displayEndLabel}
            </span>
          </div>
        </div>
      )}
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
