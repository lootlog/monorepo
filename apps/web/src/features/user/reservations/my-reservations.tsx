import { useState } from "react";
import { useSearch } from "@tanstack/react-router";
import { CalendarX2, SearchX } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  useListMyReservations,
  type ListMyReservationsStatus,
  type MyReservationsResponseDtoItemsItem,
} from "@lootlog/client/main";
import { Button } from "@lootlog/ui/components/button";

import { EmptyState } from "@/components/common/empty-state";
import { ListTileSkeleton } from "@/components/common/list-tile-skeleton";
import { ListToolbar } from "@/components/common/list-toolbar";
import { PageTabsLayout } from "@/components/layout/page-tabs-layout";
import { ROUTES } from "@/config/routes";
import { StatisticsQueryState } from "@/features/user/statistics/statistics-query-state";
import { EditMyReservationDialog } from "./edit-my-reservation-dialog";
import { MyReservationListItem } from "./my-reservation-list-item";
import { MY_RESERVATION_STATUSES } from "./my-reservations-search";
import { useCancelMyReservation } from "./use-cancel-my-reservation";

const matchesSearch = (
  reservation: MyReservationsResponseDtoItemsItem,
  search: string,
) =>
  [reservation.spotName, reservation.sourceOrganization.name].some((name) =>
    name.toLocaleLowerCase("pl").includes(search),
  );

/** The player's reservations across Lootlogs: upcoming ones and history. */
export function MyReservations() {
  const { t } = useTranslation();

  const { status = "upcoming" } = useSearch({
    from: "/_authenticated/@me/reservations",
  });

  const [search, setSearch] = useState("");
  const query = useListMyReservations({ status });
  const cancelMutation = useCancelMyReservation();

  const [editingReservation, setEditingReservation] =
    useState<MyReservationsResponseDtoItemsItem | null>(null);

  const isUpcoming = status === "upcoming";
  const normalizedSearch = search.trim().toLocaleLowerCase("pl");

  const reservations = (query.data?.items ?? []).filter((reservation) =>
    matchesSearch(reservation, normalizedSearch),
  );

  const statusLabel = (value: ListMyReservationsStatus) =>
    t(
      value === "upcoming"
        ? "reservations.my.upcoming"
        : "reservations.my.history",
    );

  const renderEmpty = () =>
    normalizedSearch ? (
      <EmptyState
        framed
        icon={SearchX}
        title={t("reservations.my.emptyFiltered")}
        description={t("reservations.empty.searchDescription")}
        action={
          <Button type="button" variant="outline" onClick={() => setSearch("")}>
            {t("reservations.clearSearch")}
          </Button>
        }
      />
    ) : (
      <EmptyState
        framed
        icon={CalendarX2}
        title={t(
          isUpcoming
            ? "reservations.my.emptyUpcoming"
            : "reservations.my.emptyHistory",
        )}
        description={t("reservations.my.emptyDescription")}
      />
    );

  return (
    <div className="flex h-full min-h-0 flex-col">
      <PageTabsLayout
        ariaLabel={t("reservations.my.tabsLabel")}
        activeId={status}
        tabs={MY_RESERVATION_STATUSES.map((value) => ({
          id: value,
          label: statusLabel(value),
          href: ROUTES.user.reservations,
          search: { status: value === "upcoming" ? undefined : value },
        }))}
      >
        <h1 className="sr-only">{t("reservations.my.title")}</h1>
        <div>
          <ListToolbar
            search={search}
            onSearchChange={setSearch}
            placeholder={t("reservations.my.filterPlaceholder")}
            label={t("reservations.my.filterLabel")}
            clearLabel={t("reservations.clearSearch")}
            disabled={query.isPending}
          />
          <StatisticsQueryState
            query={query}
            errorMessage={t("reservations.loadError")}
            loading={
              <div role="status" aria-label={t("common.loading")}>
                {Array.from({ length: 6 }, (_, index) => (
                  <ListTileSkeleton key={index} actions={isUpcoming ? 2 : 0} />
                ))}
              </div>
            }
          >
            {reservations.length > 0 ? (
              <ul>
                {reservations.map((reservation) => (
                  <MyReservationListItem
                    key={reservation.id}
                    reservation={reservation}
                    showEdit={isUpcoming}
                    showCancel={isUpcoming}
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
              <div className="p-3">{renderEmpty()}</div>
            )}
          </StatisticsQueryState>
        </div>
        <EditMyReservationDialog
          reservation={editingReservation}
          open={editingReservation !== null}
          onOpenChange={(open) => {
            if (!open) setEditingReservation(null);
          }}
        />
      </PageTabsLayout>
    </div>
  );
}
