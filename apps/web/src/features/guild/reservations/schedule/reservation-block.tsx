import { format } from "date-fns";
import { CalendarClock, MessageSquareText, Trash2 } from "lucide-react";
import { useEffect, useEffectEvent, useRef } from "react";
import { useTranslation } from "react-i18next";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@lootlog/ui/components/avatar";
import { Button } from "@lootlog/ui/components/button";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@lootlog/ui/components/context-menu";
import { cn } from "cn";
import type { ReservationSegment } from "./types";

type ReservationBlockProps = {
  segment: ReservationSegment;
  className?: string;
  style?: React.CSSProperties;
  onSelect: () => void;
  onCancel?: () => void;
  isCancelPending?: boolean;
  cancelDisabled?: boolean;
  onContextMenuOpenChange?: (open: boolean) => void;
  onContextMenuOutsidePress?: (event: Event) => void;
};

/**
 * A partner's reservation shows its Lootlog's server icon instead of the
 * author, whom players of this Lootlog rarely know.
 */
const getBlockAvatar = (
  reservation: ReservationSegment["reservation"],
  isPartner: boolean,
) => {
  const name = isPartner
    ? reservation.sourceOrganization.name
    : reservation.author.displayName;

  return {
    url: isPartner
      ? reservation.sourceOrganization.iconUrl
      : reservation.author.avatarUrl,
    fallback: name.charAt(0).toUpperCase() || "?",
  };
};

export function ReservationBlock({
  segment,
  className,
  style,
  onSelect,
  onCancel,
  isCancelPending = false,
  cancelDisabled = false,
  onContextMenuOpenChange,
  onContextMenuOutsidePress,
}: ReservationBlockProps) {
  const { t } = useTranslation();
  const { reservation } = segment;
  const isContextMenuOpenRef = useRef(false);

  const notifyContextMenuClosedOnUnmount = useEffectEvent(() => {
    if (!isContextMenuOpenRef.current) return;
    isContextMenuOpenRef.current = false;
    onContextMenuOpenChange?.(false);
  });

  // The menu stays open while a cancel is pending; the block unmounts once the
  // reservation disappears, and the menu never reports that it closed.
  useEffect(() => () => notifyContextMenuClosedOnUnmount(), []);
  const durationMinutes = Math.round(segment.durationHours * 60);
  const showStackedTime = durationMinutes >= 45;
  const showInlineTime = durationMinutes < 45 && segment.laneCount === 1;
  const showDetails = durationMinutes >= 90;

  const avatarClassName = showDetails
    ? "size-6"
    : "hidden size-4 @min-[7rem]:flex";

  const isPartner = !reservation.sourceOrganization.isCurrent;
  const time = `${format(segment.segmentStart, "HH:mm")}–${format(segment.segmentEnd, "HH:mm")}`;

  const avatar = getBlockAvatar(reservation, isPartner);

  const block = (
    <button
      type="button"
      onClick={onSelect}
      onPointerDown={(event) => event.stopPropagation()}
      style={style}
      aria-label={t("reservations.schedule.block.open", {
        name: reservation.author.displayName,
        time,
        organization: reservation.sourceOrganization.name,
      })}
      className={cn(
        "reservation-card @container group flex min-w-0 cursor-pointer overflow-hidden rounded-md border px-1.5 py-1 text-left shadow-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
        isPartner
          ? "border-border bg-muted/70 hover:bg-muted"
          : "border-primary/50 bg-primary/20 hover:bg-primary/30",
        className,
      )}
    >
      <div className="flex min-w-0 flex-1 items-center gap-1.5">
        <Avatar
          data-slot="reservation-avatar"
          className={cn(
            "shrink-0",
            avatarClassName,
            isPartner && "rounded-[4px]",
          )}
        >
          <AvatarImage src={avatar.url ?? undefined} alt="" />
          <AvatarFallback
            className={cn("text-[10px]", isPartner && "rounded-[4px]")}
          >
            {avatar.fallback}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-1">
            <span className="block truncate text-xs font-semibold leading-tight">
              {reservation.author.displayName}
            </span>
            {reservation.comment && showDetails && (
              <MessageSquareText
                className="size-3 shrink-0"
                aria-hidden="true"
              />
            )}
            {showInlineTime && (
              <span className="ml-auto shrink-0 text-[11px] font-normal leading-tight tabular-nums text-muted-foreground">
                {time}
              </span>
            )}
          </div>
          {showStackedTime && (
            <span className="mt-0.5 block truncate text-[11px] leading-tight tabular-nums text-muted-foreground">
              {time}
            </span>
          )}
          {showDetails && isPartner && (
            <span className="mt-0.5 block truncate text-[11px] leading-tight text-muted-foreground">
              {reservation.sourceOrganization.name}
            </span>
          )}
        </div>
      </div>
      {isPartner && (
        <span className="sr-only">
          {t("reservations.schedule.block.partner", {
            organization: reservation.sourceOrganization.name,
          })}
        </span>
      )}
    </button>
  );

  return (
    <ContextMenu
      onOpenChange={(open, eventDetails) => {
        isContextMenuOpenRef.current = open;
        onContextMenuOpenChange?.(open);

        if (!open && eventDetails.reason === "outside-press") {
          onContextMenuOutsidePress?.(eventDetails.event);
        }
      }}
    >
      <ContextMenuTrigger render={block} />
      <ContextMenuContent className="min-w-48">
        <ContextMenuItem className="gap-2" onClick={onSelect}>
          <CalendarClock className="size-4 text-muted-foreground" />
          {t("reservations.details.title")}
        </ContextMenuItem>
        {onCancel && (
          <>
            <ContextMenuSeparator />
            <ContextMenuItem
              className="w-full justify-start gap-2 text-destructive focus:bg-destructive/10 focus:text-destructive"
              closeOnClick={false}
              render=<Button
                variant="ghost"
                loading={isCancelPending}
                icon={<Trash2 className="size-4" />}
              />
              disabled={isCancelPending || cancelDisabled}
              onClick={onCancel}
            >
              {t(
                reservation.isMine
                  ? "reservations.details.cancel"
                  : "reservations.details.remove",
              )}
            </ContextMenuItem>
          </>
        )}
      </ContextMenuContent>
    </ContextMenu>
  );
}
