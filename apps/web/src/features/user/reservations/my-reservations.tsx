import { useState } from "react";
import { CalendarX2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useListMyReservations } from "@lootlog/api-client/react-query/main/reservations";
import type { ListMyReservationsStatus } from "@lootlog/api-client/models/main/list-my-reservations-status";
import type { MyReservationsResponseDtoItemsItem } from "@lootlog/api-client/models/main/my-reservations-response-dto-items-item";
import { Card } from "@lootlog/ui/components/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@lootlog/ui/components/empty";
import { Tabs, TabsList, TabsTrigger } from "@lootlog/ui/components/tabs";
import { EditMyReservationDialog } from "./edit-my-reservation-dialog";
import { MyReservationListItem } from "./my-reservation-list-item";
import { useCancelMyReservation } from "./use-cancel-my-reservation";

export function MyReservations() {
  const { t } = useTranslation();
  const [status, setStatus] = useState<ListMyReservationsStatus>("upcoming");
  const query = useListMyReservations({ status });
  const deleteMutation = useCancelMyReservation();
  const [editingReservation, setEditingReservation] =
    useState<MyReservationsResponseDtoItemsItem | null>(null);

  return (
    <div className="w-full space-y-4 p-3">
      <div>
        <h1 className="text-xl font-semibold">{t("reservations.my.title")}</h1>
        <p className="text-sm text-muted-foreground">
          {t("reservations.my.description")}
        </p>
      </div>
      <Tabs
        value={status}
        onValueChange={(value) => setStatus(value as ListMyReservationsStatus)}
      >
        <TabsList aria-label={t("reservations.my.tabsLabel")}>
          <TabsTrigger value="upcoming">
            {t("reservations.my.upcoming")}
          </TabsTrigger>
          <TabsTrigger value="past">{t("reservations.my.history")}</TabsTrigger>
        </TabsList>
      </Tabs>

      <Card className="gap-0 py-0">
        {query.data?.items.length ? (
          <ul>
            {query.data.items.map((reservation) => (
              <MyReservationListItem
                key={reservation.id}
                reservation={reservation}
                showEdit={status === "upcoming"}
                showCancel={status === "upcoming"}
                cancelPending={deleteMutation.isPending}
                onEdit={() => setEditingReservation(reservation)}
                onCancel={() =>
                  deleteMutation.mutate({
                    pathParams: { reservationId: reservation.id },
                  })
                }
              />
            ))}
          </ul>
        ) : (
          <Empty className="min-h-64">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <CalendarX2 />
              </EmptyMedia>
              <EmptyTitle>
                {query.isPending
                  ? t("common.loading")
                  : t(
                      status === "upcoming"
                        ? "reservations.my.emptyUpcoming"
                        : "reservations.my.emptyHistory",
                    )}
              </EmptyTitle>
              <EmptyDescription>
                {t("reservations.my.emptyDescription")}
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        )}
      </Card>
      <EditMyReservationDialog
        reservation={editingReservation}
        open={editingReservation !== null}
        onOpenChange={(open) => {
          if (!open) setEditingReservation(null);
        }}
      />
    </div>
  );
}
