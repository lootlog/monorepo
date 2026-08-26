import { useEffect, useState } from "react";
import { format, isSameDay } from "date-fns";
import { pl } from "date-fns/locale";
import { Bell, CalendarClock, MessageSquareText, Trash2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  getListReservationSpotsQueryKey,
  getListSpotReservationsQueryKey,
  useDeleteReservation,
} from "@lootlog/api-client/react-query/main/reservations";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@lootlog/ui/components/avatar";
import { Button } from "@lootlog/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@lootlog/ui/components/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@lootlog/ui/components/drawer";
import { useIsMobile } from "@lootlog/ui/hooks/use-mobile";
import { ReservationOrganizationBadge } from "@/components/reservation-organization-badge";
import { useReservationOrganizationIcon } from "@/features/user/reservations/use-reservation-organization-icon";
import { getReservationErrorMessage } from "../get-reservation-error-message";
import type { NormalizedReservation } from "./normalize-reservation";

type ReservationDetailsProps = {
  reservation: NormalizedReservation | null;
  guildId: string;
  spotId: string;
  onOpenChange: (open: boolean) => void;
};

function formatReservationRange(startsAt: Date, endsAt: Date) {
  if (isSameDay(startsAt, endsAt)) {
    return `${format(startsAt, "EEEE, d MMMM yyyy", { locale: pl })} · ${format(startsAt, "HH:mm")}–${format(endsAt, "HH:mm")}`;
  }

  return `${format(startsAt, "EEEE, d MMMM yyyy, HH:mm", { locale: pl })} – ${format(endsAt, "EEEE, d MMMM yyyy, HH:mm", { locale: pl })}`;
}

export function ReservationDetails({
  reservation,
  guildId,
  spotId,
  onOpenChange,
}: ReservationDetailsProps) {
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const queryClient = useQueryClient();
  const [lastReservation, setLastReservation] =
    useState<NormalizedReservation | null>(reservation);
  const displayedReservation = reservation ?? lastReservation;
  const organizationIconUrl = useReservationOrganizationIcon(
    displayedReservation?.sourceOrganization ?? {
      calendarPath: "",
      iconUrl: null,
    },
  );
  const deleteMutation = useDeleteReservation({
    mutation: {
      onSuccess: async () => {
        await Promise.all([
          queryClient.invalidateQueries({
            queryKey: getListReservationSpotsQueryKey({ guildId }),
          }),
          queryClient.invalidateQueries({
            queryKey: getListSpotReservationsQueryKey({ guildId, spotId }),
          }),
        ]);
        toast.success(t("reservations.details.cancelled"));
        onOpenChange(false);
      },
      onError: (error) => toast.error(getReservationErrorMessage(error, t)),
    },
  });

  useEffect(() => {
    if (reservation) setLastReservation(reservation);
  }, [reservation]);

  if (!displayedReservation) {
    return isMobile ? (
      <Drawer open={false} onOpenChange={onOpenChange} />
    ) : (
      <Dialog open={false} onOpenChange={onOpenChange} />
    );
  }
  const fallback =
    displayedReservation.author.displayName.charAt(0).toUpperCase() || "?";
  const title = t("reservations.details.title");
  const description = t("reservations.details.description", {
    spot: displayedReservation.spotName,
  });
  const content = (
    <div className="space-y-4 px-4 pb-4">
      <div className="flex min-w-0 items-center gap-3">
        <Avatar className="size-12 shrink-0 border border-border">
          <AvatarImage
            src={displayedReservation.author.avatarUrl ?? undefined}
            alt=""
          />
          <AvatarFallback>{fallback}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-semibold">
            {displayedReservation.author.displayName}
          </p>
          <ReservationOrganizationBadge
            name={displayedReservation.sourceOrganization.name}
            iconUrl={organizationIconUrl}
            className="mt-1.5"
          />
        </div>
      </div>

      <dl className="divide-y border-t text-sm">
        <div className="grid grid-cols-[1.25rem_minmax(0,1fr)] gap-x-3 py-3">
          <CalendarClock className="mt-0.5 size-4 text-primary" />
          <div className="min-w-0">
            <dt className="text-xs text-muted-foreground">
              {t("reservations.details.time")}
            </dt>
            <dd className="font-medium">
              {formatReservationRange(
                displayedReservation.startsAt,
                displayedReservation.endsAt,
              )}
            </dd>
          </div>
        </div>
        {displayedReservation.isMine && (
          <div className="grid grid-cols-[1.25rem_minmax(0,1fr)] gap-x-3 py-3">
            <Bell className="mt-0.5 size-4 text-primary" />
            <div className="min-w-0">
              <dt className="text-xs text-muted-foreground">
                {t("reservations.details.reminder")}
              </dt>
              <dd className="font-medium">
                {t(
                  `reservations.reminders.${displayedReservation.reminderMinutesBefore ?? "none"}`,
                )}
              </dd>
            </div>
          </div>
        )}
        {displayedReservation.comment && (
          <div className="grid grid-cols-[1.25rem_minmax(0,1fr)] gap-x-3 py-3">
            <MessageSquareText className="mt-0.5 size-4 text-primary" />
            <div className="min-w-0">
              <dt className="text-xs text-muted-foreground">
                {t("reservations.details.comment")}
              </dt>
              <dd className="break-words">{displayedReservation.comment}</dd>
            </div>
          </div>
        )}
      </dl>
    </div>
  );
  const footer = (
    <footer className="flex flex-col-reverse gap-2 border-t px-4 py-3 sm:flex-row sm:justify-end">
      <Button
        type="button"
        variant="outline"
        className="w-full sm:w-auto"
        disabled={deleteMutation.isPending}
        onClick={() => onOpenChange(false)}
      >
        {t("common.cancel")}
      </Button>
      {displayedReservation.canCancel && (
        <Button
          type="button"
          variant="destructive"
          className="w-full sm:w-auto"
          disabled={deleteMutation.isPending}
          onClick={() =>
            deleteMutation.mutate({
              pathParams: {
                guildId,
                reservationId: displayedReservation.id,
              },
            })
          }
        >
          <Trash2 />
          {t("reservations.details.cancel")}
        </Button>
      )}
    </footer>
  );

  if (isMobile) {
    return (
      <Drawer open={reservation !== null} onOpenChange={onOpenChange}>
        <DrawerContent className="p-0">
          <DrawerHeader className="border-b text-left">
            <DrawerTitle>{title}</DrawerTitle>
            <DrawerDescription>{description}</DrawerDescription>
          </DrawerHeader>
          {content}
          {footer}
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={reservation !== null} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader className="pb-4">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {content}
        {footer}
      </DialogContent>
    </Dialog>
  );
}
