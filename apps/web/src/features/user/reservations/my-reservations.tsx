import { SectionCardHeader } from "@lootlog/ui/components/section-card-header";
import { PageHeader } from "@/components/common/page-header";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import { Skeleton } from "@lootlog/ui/components/skeleton";
import { useState } from "react";
import { CalendarDays, CalendarX2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  useListMyReservations,
  type ListMyReservationsStatus,
  type MyReservationsResponseDtoItemsItem,
} from "@lootlog/client/main";

import { EmptyState } from "@/components/common/empty-state";
import { SectionCard } from "@/components/common/section-card/section-card";
import { SectionCardContent } from "@/components/common/section-card/section-card-content";
import { AnimatedToggleGroup } from "@/components/ui/animated-toggle-group";
import { StatisticsQueryState } from "@/features/user/statistics/statistics-query-state";
import { EditMyReservationDialog } from "./edit-my-reservation-dialog";
import { MyReservationListItem } from "./my-reservation-list-item";
import { useCancelMyReservation } from "./use-cancel-my-reservation";

const STATUSES = [
  "upcoming",
  "past",
] as const satisfies readonly ListMyReservationsStatus[];

export function MyReservations() {
  const { t } = useTranslation();
  const [status, setStatus] = useState<ListMyReservationsStatus>("upcoming");
  const query = useListMyReservations({ status });
  const cancelMutation = useCancelMyReservation();

  const [editingReservation, setEditingReservation] =
    useState<MyReservationsResponseDtoItemsItem | null>(null);

  const statusLabel = (value: ListMyReservationsStatus) =>
    t(
      value === "upcoming"
        ? "reservations.my.upcoming"
        : "reservations.my.history",
    );

  return (
    <ScrollArea className="h-full min-h-0">
      <div className="flex w-full min-w-0 flex-col gap-3 p-3">
        <PageHeader
          icon={CalendarDays}
          title={t("reservations.my.title")}
          description={t("reservations.my.description")}
          actions={
            <AnimatedToggleGroup
              label={t("reservations.my.tabsLabel")}
              value={status}
              onValueChange={setStatus}
              size="large"
              className="w-full sm:w-fit"
              options={STATUSES.map((value) => ({
                value,
                label: statusLabel(value),
              }))}
            />
          }
        />

        <SectionCard>
          <SectionCardHeader title={statusLabel(status)} />
          <SectionCardContent className="flex flex-col p-0">
            <StatisticsQueryState
              query={query}
              centered
              errorMessage={t("reservations.loadError")}
              loading={
                <div
                  role="status"
                  aria-label={t("common.loading")}
                  className="divide-y divide-border"
                >
                  {Array.from({ length: 4 }, (_, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-2 px-3 py-2"
                    >
                      <Skeleton className="size-9 rounded-xl" />
                      <div className="flex-1 space-y-1.5">
                        <Skeleton className="h-4 w-40" />
                        <Skeleton className="h-3 w-28" />
                      </div>
                    </div>
                  ))}
                </div>
              }
            >
              {query.data?.items.length ? (
                <ul>
                  {query.data.items.map((reservation) => (
                    <MyReservationListItem
                      key={reservation.id}
                      reservation={reservation}
                      showEdit={status === "upcoming"}
                      showCancel={status === "upcoming"}
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
                  title={t(
                    status === "upcoming"
                      ? "reservations.my.emptyUpcoming"
                      : "reservations.my.emptyHistory",
                  )}
                  description={t("reservations.my.emptyDescription")}
                />
              )}
            </StatisticsQueryState>
          </SectionCardContent>
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
