import { SectionCardHeader } from "@lootlog/ui/components/section-card-header";
import { PageHeader } from "@/components/common/page-header";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import { useState } from "react";
import { CalendarX2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useListMyReservations } from "@lootlog/client/main";
import type { ListMyReservationsStatus } from "@lootlog/client/main";
import type { MyReservationsResponseDtoItemsItem } from "@lootlog/client/main";
import { SectionCard } from "@/components/common/section-card/section-card";
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
    <ScrollArea className="h-full min-h-0">
      <div className="w-full space-y-4 p-3">
        <PageHeader
          title={t("reservations.my.title")}
          description={t("reservations.my.description")}
        />
        <Tabs
          value={status}
          onValueChange={(value) =>
            setStatus(value as ListMyReservationsStatus)
          }
        >
          <TabsList aria-label={t("reservations.my.tabsLabel")}>
            <TabsTrigger value="upcoming">
              {t("reservations.my.upcoming")}
            </TabsTrigger>
            <TabsTrigger value="past">
              {t("reservations.my.history")}
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <SectionCard>
          <SectionCardHeader
            title={t(
              status === "upcoming"
                ? "reservations.my.upcoming"
                : "reservations.my.history",
            )}
          />
          {query.data?.items.length ? (
            <ul>
              {query.data.items.map((reservation) => (
                <MyReservationListItem
                  key={reservation.id}
                  reservation={reservation}
                  showEdit={status === "upcoming"}
                  showCancel={status === "upcoming"}
                  cancelDisabled={deleteMutation.isPending}
                  cancelPending={
                    deleteMutation.isPending &&
                    deleteMutation.variables?.pathParams.reservationId ===
                      reservation.id
                  }
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
        </SectionCard>
        <EditMyReservationDialog
          reservation={editingReservation}
          open={editingReservation !== null}
          onOpenChange={(open) => {
            if (!open) setEditingReservation(null);
          }}
        />
      </div>
    </ScrollArea>
  );
}
