import { format } from "date-fns";
import { pl } from "date-fns/locale";
import { Link } from "@tanstack/react-router";
import { Bell, ChevronRight, Pencil, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { MyReservationsResponseDtoItemsItem } from "@lootlog/api-client/models/main/my-reservations-response-dto-items-item";
import { Badge } from "@lootlog/ui/components/badge";
import { Button } from "@lootlog/ui/components/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@lootlog/ui/components/tooltip";
import { ReservationOrganizationBadge } from "@/components/reservation-organization-badge";
import { useReservationOrganizationIcon } from "./use-reservation-organization-icon";

type MyReservationListItemProps = {
  reservation: MyReservationsResponseDtoItemsItem;
  showCancel?: boolean;
  showEdit?: boolean;
  cancelPending?: boolean;
  onEdit?: () => void;
  onCancel?: () => void;
};

export function MyReservationListItem({
  reservation,
  showCancel = false,
  showEdit = false,
  cancelPending = false,
  onEdit,
  onCancel,
}: MyReservationListItemProps) {
  const { t } = useTranslation();
  const organizationIconUrl = useReservationOrganizationIcon(
    reservation.sourceOrganization,
  );

  return (
    <li className="group flex min-w-0 items-stretch border-b transition-colors last:border-b-0 hover:bg-muted/40 focus-within:bg-muted/40">
      <Link
        to={reservation.sourceOrganization.calendarPath}
        className="flex min-w-0 flex-1 items-center gap-2 px-3 py-2 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
        aria-label={t("reservations.my.open", {
          spot: reservation.spotName,
        })}
      >
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-2">
            <span className="truncate text-sm font-semibold transition-colors group-hover:text-primary">
              {reservation.spotName}
            </span>
            <ReservationOrganizationBadge
              name={reservation.sourceOrganization.name}
              iconUrl={organizationIconUrl}
            />
          </div>
          <div className="mt-1 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
            <span className="truncate text-xs text-muted-foreground">
              {format(new Date(reservation.startsAt), "EEE, d MMM, HH:mm", {
                locale: pl,
              })}
              {" – "}
              {format(new Date(reservation.endsAt), "HH:mm", { locale: pl })}
            </span>
            {reservation.reminderMinutesBefore !== null && (
              <Badge
                variant="secondary"
                className="h-5 gap-1 rounded-md px-1.5 text-[10px] font-medium normal-case tracking-normal shadow-none"
              >
                <Bell className="size-3" />
                <span>
                  {t(
                    `reservations.reminders.${reservation.reminderMinutesBefore}`,
                  )}
                </span>
              </Badge>
            )}
          </div>
        </div>
        <ChevronRight
          aria-hidden
          className="size-4 shrink-0 text-muted-foreground transition-[color,transform] group-hover:translate-x-0.5 group-hover:text-primary"
        />
      </Link>
      {((showEdit && reservation.canEdit) ||
        (showCancel && reservation.canCancel)) && (
        <div className="flex shrink-0 items-center gap-0.5 pr-2">
          {showEdit && reservation.canEdit && (
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-8 text-muted-foreground hover:bg-primary/10 hover:text-primary"
                    onClick={onEdit}
                    aria-label={t("reservations.my.edit", {
                      spot: reservation.spotName,
                    })}
                  >
                    <Pencil className="size-3.5" />
                  </Button>
                }
              />
              <TooltipContent sideOffset={4}>
                {t("reservations.my.edit", { spot: reservation.spotName })}
              </TooltipContent>
            </Tooltip>
          )}
          {showCancel && reservation.canCancel && (
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-8 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    disabled={cancelPending}
                    onClick={onCancel}
                    aria-label={t("reservations.my.cancel", {
                      spot: reservation.spotName,
                    })}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                }
              />
              <TooltipContent sideOffset={4}>
                {t("reservations.my.cancel", { spot: reservation.spotName })}
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      )}
    </li>
  );
}
