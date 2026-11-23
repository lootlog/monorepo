import { ChevronLink } from "@lootlog/ui/components/chevron-link";
import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { CalendarX2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  useListMyReservations,
  type MyReservationsResponseDtoItemsItem,
} from "@lootlog/client/main";

import { EmptyState } from "@lootlog/ui/components/empty-state";
import { BandSection } from "@/components/common/band-section";
import { ListTileSkeleton } from "@/components/common/list-tile-skeleton";
import { ROUTES } from "@/config/routes";
import { StatisticsQueryState } from "@/components/common/statistics-query-state";
import { EditMyReservationDialog } from "./edit-my-reservation-dialog";
import { MyReservationListItem } from "./my-reservation-list-item";
import { useCancelMyReservation } from "./use-cancel-my-reservation";

export function MyReservationsCard() {
  const { t } = useTranslation();
  const query = useListMyReservations({ status: "upcoming" });
  const cancelMutation = useCancelMyReservation();

  const [editingReservation, setEditingReservation] =
    useState<MyReservationsResponseDtoItemsItem | null>(null);

  const reservations = query.data?.items.slice(0, 5) ?? [];

  return (
    <BandSection
      id="dashboard-my-reservations-title"
      title={t("reservations.my.title")}
      count={query.data?.items.length || undefined}
      tiled
      trailing={
        <ChevronLink render=<Link to={ROUTES.user.reservations} />>
          {t("reservations.my.showAll")}
        </ChevronLink>
      }
    >
      <StatisticsQueryState
        query={query}
        compact
        errorMessage={t("reservations.loadError")}
        loading={
          <div role="status" aria-label={t("common.loading")}>
            {Array.from({ length: 3 }, (_, index) => (
              <ListTileSkeleton key={index} actions={2} />
            ))}
          </div>
        }
      >
        {reservations.length ? (
          <ul>
            {reservations.map((reservation) => (
              <MyReservationListItem
                key={reservation.id}
                reservation={reservation}
                showEdit
                showCancel
                cancelDisabled={cancelMutation.isPending}
                cancelPending={
                  cancelMutation.isPending &&
                  cancelMutation.variables?.pathParams.reservationId ===
                    reservation.id
                }
                onEdit={() => setEditingReservation(reservation)}
                onCancel={async () => {
                  await cancelMutation.mutateAsync({
                    pathParams: { reservationId: reservation.id },
                  });
                }}
              />
            ))}
          </ul>
        ) : (
          <EmptyState
            icon={CalendarX2}
            title={t("reservations.my.emptyUpcoming")}
            compact
            className="flex-1"
          />
        )}
      </StatisticsQueryState>
      <EditMyReservationDialog
        reservation={editingReservation}
        open={editingReservation !== null}
        onOpenChange={(open) => {
          if (!open) setEditingReservation(null);
        }}
      />
    </BandSection>
  );
}
