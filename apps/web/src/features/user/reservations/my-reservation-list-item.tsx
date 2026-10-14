import { format } from "date-fns";
import { pl } from "date-fns/locale";
import { Link } from "@tanstack/react-router";
import { Bell, Clock3, Pencil, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { MyReservationsResponseDtoItemsItem } from "@lootlog/client/main";
import { Button } from "@lootlog/ui/components/button";
import { ConfirmDeleteDialog } from "@lootlog/ui/components/confirm-delete-dialog";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@lootlog/ui/components/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@lootlog/ui/components/tooltip";
import {
  getListTileLinkClassName,
  LIST_TILE_ACTIONS_CLASS,
  LIST_TILE_RULE_CLASS,
} from "@/components/common/list-tile";
import { MetaItem } from "@/components/common/meta-item";
import { useReservationOrganizationIcon } from "./use-reservation-organization-icon";

type MyReservationListItemProps = {
  reservation: MyReservationsResponseDtoItemsItem;
  showCancel?: boolean;
  showEdit?: boolean;
  cancelPending?: boolean;
  cancelDisabled?: boolean;
  onEdit?: () => void;
  /** Runs after the player confirms; a rejection keeps the dialog open. */
  onCancel?: () => Promise<void>;
};

/** One of the player's reservations as a tile; the tile opens its calendar. */
export function MyReservationListItem({
  reservation,
  showCancel = false,
  showEdit = false,
  cancelPending = false,
  cancelDisabled = false,
  onEdit,
  onCancel,
}: MyReservationListItemProps) {
  const { t } = useTranslation();

  const organizationIconUrl = useReservationOrganizationIcon(
    reservation.sourceOrganization,
  );

  const canEdit = showEdit && reservation.canEdit;
  const canCancel = showCancel && reservation.canCancel;
  const hasActions = canEdit || canCancel;

  return (
    <li data-list-tile className={LIST_TILE_RULE_CLASS}>
      <div className="flex h-full items-center transition-colors hover:bg-muted/30 motion-reduce:transition-none">
        <Link
          to={reservation.sourceOrganization.calendarPath}
          className={getListTileLinkClassName(hasActions)}
          aria-label={`${t("reservations.my.open", { spot: reservation.spotName })} — ${reservation.sourceOrganization.name}`}
        >
          <Tooltip>
            <TooltipTrigger
              render=<span
                className="shrink-0 rounded-lg"
                aria-label={reservation.sourceOrganization.name}
              />
            >
              <Avatar className="size-9 rounded-lg" aria-hidden>
                <AvatarImage src={organizationIconUrl ?? undefined} alt="" />
                <AvatarFallback className="rounded-none text-sm font-semibold">
                  {reservation.sourceOrganization.name
                    .charAt(0)
                    .toUpperCase() || "?"}
                </AvatarFallback>
              </Avatar>
            </TooltipTrigger>
            <TooltipContent>
              {reservation.sourceOrganization.name}
            </TooltipContent>
          </Tooltip>
          <span className="flex min-w-0 flex-1 flex-col gap-1">
            <span className="truncate text-sm font-semibold">
              {reservation.spotName}
            </span>
            <span className="flex min-w-0 items-center gap-x-3">
              <MetaItem icon={Clock3} className="shrink-0">
                {format(new Date(reservation.startsAt), "EEE, d MMM, HH:mm", {
                  locale: pl,
                })}
                {" – "}
                {format(new Date(reservation.endsAt), "HH:mm", { locale: pl })}
              </MetaItem>
              {reservation.reminderMinutesBefore !== null && (
                <MetaItem icon={Bell} className="min-w-0">
                  <span className="min-w-0 truncate">
                    {t(
                      `reservations.reminders.${reservation.reminderMinutesBefore}`,
                    )}
                  </span>
                </MetaItem>
              )}
            </span>
          </span>
        </Link>
        {hasActions && (
          <div className={LIST_TILE_ACTIONS_CLASS}>
            {canEdit && (
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      className="text-muted-foreground"
                      onClick={onEdit}
                      aria-label={t("reservations.my.edit", {
                        spot: reservation.spotName,
                      })}
                    >
                      <Pencil className="size-4" />
                    </Button>
                  }
                />
                <TooltipContent sideOffset={4}>
                  {t("reservations.my.edit", { spot: reservation.spotName })}
                </TooltipContent>
              </Tooltip>
            )}
            {canCancel && (
              <ConfirmDeleteDialog
                title={t("reservations.my.cancelConfirmTitle", {
                  spot: reservation.spotName,
                })}
                description={t("reservations.my.cancelConfirmDescription")}
                confirmButtonLabel={t("reservations.details.cancel")}
                cancelButtonLabel={t("reservations.my.keep")}
                disabled={cancelDisabled}
                onConfirm={onCancel ?? (() => undefined)}
                triggerTooltip={t("reservations.my.cancel", {
                  spot: reservation.spotName,
                })}
                trigger={
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    loading={cancelPending}
                    aria-label={t("reservations.my.cancel", {
                      spot: reservation.spotName,
                    })}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                }
              />
            )}
          </div>
        )}
      </div>
    </li>
  );
}
