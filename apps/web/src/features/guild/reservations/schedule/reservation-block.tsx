import { format } from "date-fns";
import {
  Building2,
  CalendarClock,
  MessageSquareText,
  Trash2,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@lootlog/ui/components/avatar";
import { Badge } from "@lootlog/ui/components/badge";
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
  onContextMenuOpenChange?: (open: boolean) => void;
  onContextMenuOutsidePress?: (event: Event) => void;
};

export function ReservationBlock({
  segment,
  className,
  style,
  onSelect,
  onCancel,
  isCancelPending = false,
  onContextMenuOpenChange,
  onContextMenuOutsidePress,
}: ReservationBlockProps) {
  const { t } = useTranslation();
  const { reservation } = segment;
  const durationMinutes = Math.round(segment.durationHours * 60);
  const showStackedTime = durationMinutes >= 45;
  const showInlineTime = durationMinutes < 45 && segment.laneCount === 1;
  const showDetails = durationMinutes >= 90;
  const avatarClassName = showDetails
    ? "size-6"
    : "hidden size-4 @min-[7rem]:flex";
  const isPartner = !reservation.sourceOrganization.isCurrent;
  const time = `${format(segment.segmentStart, "HH:mm")}–${format(segment.segmentEnd, "HH:mm")}`;
  const fallback =
    reservation.author.displayName.charAt(0).toUpperCase() || "?";

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
          ? "border-sky-500/45 bg-sky-500/15 hover:bg-sky-500/25"
          : "border-primary/50 bg-primary/20 hover:bg-primary/30",
        className,
      )}
    >
      <div className="flex min-w-0 flex-1 items-center gap-1.5">
        <Avatar
          data-slot="reservation-avatar"
          className={cn("shrink-0", avatarClassName)}
        >
          <AvatarImage src={reservation.author.avatarUrl ?? undefined} alt="" />
          <AvatarFallback>{fallback}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-1">
            {isPartner && (
              <Building2 className="size-3 shrink-0" aria-hidden="true" />
            )}
            <span className="block truncate text-[11px] font-semibold leading-tight">
              {reservation.author.displayName}
            </span>
            {reservation.comment && showDetails && (
              <MessageSquareText
                className="size-3 shrink-0"
                aria-hidden="true"
              />
            )}
            {showInlineTime && (
              <span className="ml-auto shrink-0 text-[10px] font-normal leading-tight text-muted-foreground">
                {time}
              </span>
            )}
          </div>
          {showStackedTime && (
            <span className="block truncate text-[10px] leading-tight text-muted-foreground">
              {time}
            </span>
          )}
          {showDetails && isPartner && (
            <Badge
              variant="outline"
              className="mt-1 max-w-full truncate text-[9px]"
            >
              {reservation.sourceOrganization.name}
            </Badge>
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
              className="gap-2 text-destructive focus:bg-destructive/10 focus:text-destructive"
              disabled={isCancelPending}
              onClick={onCancel}
            >
              <Trash2 className="size-4" />
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
