import { EmptyState } from "@lootlog/ui/components/empty-state";
import { ResultsSurface } from "@/components/common/results-surface";
import { KillStatsSearch } from "@/components/common/kill-stats-search";
import { FilterPopover } from "@lootlog/ui/components/filter-popover";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { AlertCircle, CalendarClock, ListFilter, SearchX } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "@lootlog/ui/lib/toast";
import {
  type ReservationSpotsResponseDto,
  getListReservationSpotsQueryKey,
  useListReservationSpots,
  usePinReservationSpot,
  useUnpinReservationSpot,
} from "@lootlog/client/main";

import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import { ViewModeToggle } from "@/components/ui/view-mode-toggle";
import { useGuildId } from "@/hooks/context/use-guild-id";
import { useViewMode } from "@/hooks/use-view-mode";
import { ReservationCard } from "./reservation-card";
import { ReservationCardSkeleton } from "./reservation-card-skeleton";
import {
  getReservationCollectionClassName,
  RESERVATIONS_GRID_MEDIA_QUERY,
  RESERVATIONS_VIEW_MODE_KEY,
} from "./reservation-collection-layout";
import {
  getVisibleReservationSpots,
  RESERVATION_FILTERS,
  setReservationSpotPinned,
  type ReservationFilter,
} from "./reservation-spots";
import { RetryButton } from "@/components/common/retry-button";
import { ClearFiltersButton } from "@/components/common/clear-filters-button";

type PinMutationContext = { previous?: ReservationSpotsResponseDto };

type PinMutationOptions = NonNullable<
  Parameters<typeof usePinReservationSpot<unknown, PinMutationContext>>[0]
>["mutation"];

export function Reservations() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const guildId = useGuildId() ?? "";
  const [searchValue, setSearchValue] = useState("");

  const [filter, setFilter] = useState<ReservationFilter>("all");

  const { viewMode, setViewMode, canChooseViewMode } = useViewMode(
    RESERVATIONS_VIEW_MODE_KEY,
    "grid",
    RESERVATIONS_GRID_MEDIA_QUERY,
    "grid",
  );

  const spotsQuery = useListReservationSpots(
    { guildId },
    { query: { enabled: Boolean(guildId), staleTime: 30_000 } },
  );

  const spotsQueryKey = getListReservationSpotsQueryKey({ guildId });

  const createPinMutationOptions = (isPinned: boolean): PinMutationOptions => ({
    onMutate: async ({ pathParams }) => {
      await queryClient.cancelQueries({ queryKey: spotsQueryKey });

      const previous =
        queryClient.getQueryData<ReservationSpotsResponseDto>(spotsQueryKey);

      queryClient.setQueryData<ReservationSpotsResponseDto>(
        spotsQueryKey,
        (current) =>
          setReservationSpotPinned(current, pathParams.spotId, isPinned),
      );

      return { previous };
    },
    onError: (_error, _variables, context) => {
      queryClient.setQueryData(spotsQueryKey, context?.previous);
      toast.error(t("reservations.pin.error"));
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: spotsQueryKey }),
  });

  const pinMutation = usePinReservationSpot<unknown, PinMutationContext>({
    mutation: createPinMutationOptions(true),
  });

  const unpinMutation = useUnpinReservationSpot<unknown, PinMutationContext>({
    mutation: createPinMutationOptions(false),
  });

  const normalizedSearch = searchValue.trim();

  const sortedSpots = getVisibleReservationSpots(
    spotsQuery.data ?? [],
    searchValue,
    filter,
  );

  const handlePinChange = (spotId: string, isPinned: boolean) => {
    const mutation = isPinned ? pinMutation : unpinMutation;
    mutation.mutate({ pathParams: { guildId, spotId } });
  };

  const clearFilters = () => {
    setSearchValue("");
    setFilter("all");
  };

  const filterLabel = (value: ReservationFilter) =>
    t(`reservations.filters.${value}`);

  const tiles = spotsQuery.isError ? (
    <div className="p-3">
      <EmptyState
        fill
        icon={AlertCircle}
        title={t("reservations.error.title")}
        description={t("reservations.error.description")}
        action={
          <RetryButton
            onRetry={() => spotsQuery.refetch()}
            isRetrying={spotsQuery.isFetching}
          />
        }
      />
    </div>
  ) : spotsQuery.isPending ? (
    <div aria-hidden="true" className="overflow-hidden">
      <div className={getReservationCollectionClassName(viewMode)}>
        {Array.from({ length: 8 }).map((_, index) => (
          <ReservationCardSkeleton key={index} viewMode={viewMode} />
        ))}
      </div>
    </div>
  ) : sortedSpots.length === 0 ? (
    <div className="p-3">
      {normalizedSearch || filter !== "all" ? (
        <EmptyState
          fill
          icon={SearchX}
          title={t("reservations.empty.noResults")}
          description={t("reservations.empty.noResultsDescription")}
          action={<ClearFiltersButton onClear={clearFilters} />}
        />
      ) : (
        <EmptyState
          fill
          icon={CalendarClock}
          title={t("reservations.empty.title")}
          description={t("reservations.empty.description")}
        />
      )}
    </div>
  ) : (
    <div className="overflow-hidden">
      <div className={getReservationCollectionClassName(viewMode)}>
        {sortedSpots.map((spot) => (
          <ReservationCard
            key={spot.id}
            spot={spot}
            viewMode={viewMode}
            pinDisabled={pinMutation.isPending || unpinMutation.isPending}
            pinPending={
              (pinMutation.isPending &&
                pinMutation.variables?.pathParams.spotId === spot.id) ||
              (unpinMutation.isPending &&
                unpinMutation.variables?.pathParams.spotId === spot.id)
            }
            onPinChange={(isPinned) => handlePinChange(spot.id, isPinned)}
            onOpen={() =>
              navigate({
                to: "/$guildId/reservations/$reservationId",
                params: { guildId, reservationId: spot.id },
              })
            }
          />
        ))}
      </div>
    </div>
  );

  return (
    <div className="flex h-full min-h-0 flex-col">
      <h1 className="sr-only">{t("layout.navigation.reservations")}</h1>
      <ScrollArea data-under-top-bar className="min-h-0 flex-1">
        <ResultsSurface
          search={
            <KillStatsSearch
              value={searchValue}
              placeholder={t("reservations.filterPlaceholder")}
              onChange={setSearchValue}
            />
          }
          filters={
            <>
              <FilterPopover
                options={RESERVATION_FILTERS.filter(
                  (value) => value !== "all",
                ).map((value) => ({ value, label: filterLabel(value) }))}
                value={filter === "all" ? undefined : filter}
                onValueChange={(value) =>
                  setFilter(value === filter ? "all" : value)
                }
                placeholder={t("reservations.filters.chip")}
                icon={ListFilter}
                showSearch={false}
                active={filter !== "all"}
              />
              {canChooseViewMode && (
                <ViewModeToggle
                  value={viewMode}
                  onChange={setViewMode}
                  listLabel={t("reservations.view.list")}
                  gridLabel={t("reservations.view.grid")}
                  size="sm"
                />
              )}
            </>
          }
          filtersLabel={t("reservations.filters.label")}
          chips={
            filter === "all"
              ? []
              : [
                  {
                    id: filter,
                    label: filterLabel(filter),
                    onRemove: () => setFilter("all"),
                  },
                ]
          }
          clearFiltersLabel={t("common.actions.clearFilters")}
          onClearFilters={clearFilters}
        >
          {tiles}
        </ResultsSurface>
      </ScrollArea>
    </div>
  );
}
