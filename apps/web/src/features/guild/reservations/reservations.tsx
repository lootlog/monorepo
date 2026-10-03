import { EmptyState } from "@/components/common/empty-state";
import { FilterBar } from "@/components/common/filter-bar";
import { useState } from "react";
import { useLocalStorage } from "usehooks-ts";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { CircleAlert, RotateCcw, SearchX } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  type ReservationSpotsResponseDto,
  getListReservationSpotsQueryKey,
  useListReservationSpots,
  usePinReservationSpot,
  useUnpinReservationSpot,
} from "@lootlog/client/main";

import { Button } from "@lootlog/ui/components/button";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import { SearchInput } from "@/components/ui/search-input";
import { ViewModeToggle } from "@/components/ui/view-mode-toggle";
import { useGuildId } from "@/hooks/context/use-guild-id";
import { useViewMode } from "@/hooks/use-view-mode";
import { ReservationCard } from "./reservation-card";
import { ReservationCardSkeleton } from "./reservation-card-skeleton";
import { getReservationCollectionClassName } from "./reservation-collection-layout";
import {
  ReservationFilters,
  type ReservationFilter,
} from "./reservation-filters";
import {
  getVisibleReservationSpots,
  setReservationSpotPinned,
} from "./reservation-spots";

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

  const [filter, setFilter] = useLocalStorage<ReservationFilter>(
    "reservations-filter",
    "all",
  );

  const { viewMode, setViewMode } = useViewMode("reservations-view-mode");

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

  return (
    <div className="flex h-full min-h-0 flex-col">
      <h1 className="sr-only">{t("layout.navigation.reservations")}</h1>
      <div className="px-3 pt-3">
        <FilterBar ariaLabel={t("reservations.toolbarLabel")}>
          <SearchInput
            value={searchValue}
            onChange={(event) => setSearchValue(event.target.value)}
            placeholder={t("reservations.searchPlaceholder")}
            aria-label={t("reservations.searchPlaceholder")}
            wrapperClassName="h-10 min-w-0 flex-1 basis-48"
            disabled={spotsQuery.isPending}
          />
          <ReservationFilters
            value={filter}
            onChange={setFilter}
            className="order-last basis-full xl:order-none xl:basis-auto"
          />
          <ViewModeToggle
            value={viewMode}
            onChange={setViewMode}
            listLabel={t("reservations.view.list")}
            gridLabel={t("reservations.view.grid")}
          />
        </FilterBar>
      </div>

      <div className="flex min-h-0 flex-1 flex-col pt-3">
        {spotsQuery.isPending ? (
          <ScrollArea className="min-h-0 flex-1">
            <div className={getReservationCollectionClassName(viewMode)}>
              {Array.from({ length: 8 }).map((_, index) => (
                <ReservationCardSkeleton key={index} viewMode={viewMode} />
              ))}
            </div>
          </ScrollArea>
        ) : spotsQuery.isError ? (
          <div className="px-3 pb-3">
            <EmptyState
              framed
              icon={CircleAlert}
              title={t("reservations.error.title")}
              description={t("reservations.error.description")}
              action={
                <Button
                  type="button"
                  variant="outline"
                  loading={spotsQuery.isFetching}
                  icon=<RotateCcw className="size-3.5" />
                  onClick={() => void spotsQuery.refetch()}
                >
                  {t("common.actions.retry")}
                </Button>
              }
            />
          </div>
        ) : sortedSpots.length === 0 ? (
          <div className="px-3 pb-3">
            <EmptyState
              framed
              icon={SearchX}
              title={t("reservations.empty.title")}
              description={
                normalizedSearch
                  ? t("reservations.empty.searchDescription")
                  : t("reservations.empty.description")
              }
              action={
                normalizedSearch || filter !== "all" ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setSearchValue("");
                      setFilter("all");
                    }}
                  >
                    {t("reservations.empty.clearFilters")}
                  </Button>
                ) : undefined
              }
            />
          </div>
        ) : (
          <ScrollArea className="min-h-0 flex-1">
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
                    navigate({ to: `/${guildId}/reservations/${spot.id}` })
                  }
                />
              ))}
            </div>
          </ScrollArea>
        )}
      </div>
    </div>
  );
}
