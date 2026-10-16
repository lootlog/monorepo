import { EmptyState } from "@/components/common/empty-state";
import { ListToolbar } from "@/components/common/list-toolbar";
import { HeaderSlotPortal } from "@/components/layout/header-slot-portal";
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

  const { viewMode, setViewMode, canChooseViewMode } = useViewMode(
    RESERVATIONS_VIEW_MODE_KEY,
    "grid",
    RESERVATIONS_GRID_MEDIA_QUERY,
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

  const tiles = spotsQuery.isPending ? (
    <div aria-hidden="true" className="overflow-hidden">
      <div className={getReservationCollectionClassName(viewMode)}>
        {Array.from({ length: 8 }).map((_, index) => (
          <ReservationCardSkeleton key={index} viewMode={viewMode} />
        ))}
      </div>
    </div>
  ) : sortedSpots.length === 0 ? (
    <div className="p-3">
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
              navigate({ to: `/${guildId}/reservations/${spot.id}` })
            }
          />
        ))}
      </div>
    </div>
  );

  return (
    <div className="flex h-full min-h-0 flex-col">
      <h1 className="sr-only">{t("layout.navigation.reservations")}</h1>
      {/* The view sits in the top bar, as on the loot and timer lists. */}
      {canChooseViewMode && (
        <HeaderSlotPortal slot="actions">
          <ViewModeToggle
            value={viewMode}
            onChange={setViewMode}
            listLabel={t("reservations.view.list")}
            gridLabel={t("reservations.view.grid")}
            size="default"
          />
        </HeaderSlotPortal>
      )}

      {spotsQuery.isError ? (
        <div className="p-3">
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
      ) : (
        <ScrollArea data-under-top-bar className="min-h-0 flex-1">
          <ListToolbar
            search={searchValue}
            onSearchChange={setSearchValue}
            placeholder={t("reservations.filterPlaceholder")}
            label={t("reservations.filterLabel")}
            clearLabel={t("reservations.clearSearch")}
            disabled={spotsQuery.isPending}
          >
            <ReservationFilters value={filter} onChange={setFilter} />
          </ListToolbar>
          {tiles}
        </ScrollArea>
      )}
    </div>
  );
}
