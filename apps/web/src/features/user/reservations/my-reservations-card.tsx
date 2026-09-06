import { ChevronLink } from "@lootlog/ui/components/chevron-link";
import { SectionCardHeader } from "@/components/common/section-card/section-card-header";
import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { CalendarDays } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useListMyReservations } from "@lootlog/client/main";
import type { MyReservationsResponseDtoItemsItem } from "@lootlog/client/main";
import { SectionCard } from "@/components/common/section-card/section-card";
import { SectionCardContent } from "@/components/common/section-card/section-card-content";
import { ROUTES } from "@/config/routes";
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
    <SectionCard className="gap-0 py-0">
      <SectionCardHeader
        id="dashboard-my-reservations-title"
        icon={CalendarDays}
        title={t("reservations.my.title")}
        actions={
          <ChevronLink render={<Link to={ROUTES.user.reservations} />}>
            {t("reservations.my.showAll")}
          </ChevronLink>
        }
      />
      <SectionCardContent className="p-0">
        {reservations.length ? (
          <ul>
            {reservations.map((reservation) => (
              <MyReservationListItem
                key={reservation.id}
                reservation={reservation}
                showEdit
                showCancel
                cancelPending={cancelMutation.isPending}
                onEdit={() => setEditingReservation(reservation)}
                onCancel={() =>
                  cancelMutation.mutate({
                    pathParams: { reservationId: reservation.id },
                  })
                }
              />
            ))}
          </ul>
        ) : (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">
            {query.isPending
              ? t("common.loading")
              : t("reservations.my.emptyUpcoming")}
          </p>
        )}
      </SectionCardContent>
      <EditMyReservationDialog
        reservation={editingReservation}
        open={editingReservation !== null}
        onOpenChange={(open) => {
          if (!open) setEditingReservation(null);
        }}
      />
    </SectionCard>
  );
}
