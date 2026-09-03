import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { CalendarDays, ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useListMyReservations } from "@lootlog/client/main";
import type { MyReservationsResponseDtoItemsItem } from "@lootlog/client/main";
import { Card, CardContent } from "@lootlog/ui/components/card";
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
    <Card className="gap-0 py-0">
      <header className="flex min-h-12 items-center justify-between gap-3 border-b border-border/70 px-3 py-2">
        <h2
          id="dashboard-my-reservations-title"
          className="flex min-w-0 items-center gap-2 text-sm font-semibold"
        >
          <CalendarDays className="size-4 text-primary" />
          <span className="truncate">{t("reservations.my.title")}</span>
        </h2>
        <Link
          to={ROUTES.user.reservations}
          className="inline-flex h-8 shrink-0 items-center gap-1 rounded-sm text-xs font-semibold text-muted-foreground outline-none transition-colors hover:text-primary focus-visible:ring-2 focus-visible:ring-ring/50"
        >
          {t("reservations.my.showAll")}
          <ChevronRight className="size-3.5" />
        </Link>
      </header>
      <CardContent className="p-0">
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
      </CardContent>
      <EditMyReservationDialog
        reservation={editingReservation}
        open={editingReservation !== null}
        onOpenChange={(open) => {
          if (!open) setEditingReservation(null);
        }}
      />
    </Card>
  );
}
