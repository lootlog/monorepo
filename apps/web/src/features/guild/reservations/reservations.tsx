import { useState } from "react";
import { useLocalStorage } from "usehooks-ts";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { SearchX, TriangleAlert } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import type { ReservationSpotsResponseDto } from "@lootlog/client/main";
import {
  getListReservationSpotsQueryKey,
  useListReservationSpots,
  usePinReservationSpot,
  useUnpinReservationSpot,
} from "@lootlog/client/main";
import { Button } from "@lootlog/ui/components/button";
import { Card } from "@lootlog/ui/components/card";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@lootlog/ui/components/empty";
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

  const updatePinnedState = (spotId: string, isPinned: boolean) => {
    queryClient.setQueryData<ReservationSpotsResponseDto>(
      spotsQueryKey,
      (current) => setReservationSpotPinned(current, spotId, isPinned),
    );
  };

  const pinMutation = usePinReservationSpot<unknown, PinMutationContext>({
    mutation: {
      onMutate: async ({ pathParams }) => {
        await queryClient.cancelQueries({ queryKey: spotsQueryKey });
        const previous =
          queryClient.getQueryData<ReservationSpotsResponseDto>(spotsQueryKey);
        updatePinnedState(pathParams.spotId, true);
        return { previous };
      },
      onError: (_error, _variables, context) => {
        queryClient.setQueryData(spotsQueryKey, context?.previous);
        toast.error(t("reservations.pin.error"));
      },
      onSettled: () =>
        queryClient.invalidateQueries({ queryKey: spotsQueryKey }),
    },
  });
  const unpinMutation = useUnpinReservationSpot<unknown, PinMutationContext>({
    mutation: {
      onMutate: async ({ pathParams }) => {
        await queryClient.cancelQueries({ queryKey: spotsQueryKey });
        const previous =
          queryClient.getQueryData<ReservationSpotsResponseDto>(spotsQueryKey);
        updatePinnedState(pathParams.spotId, false);
        return { previous };
      },
      onError: (_error, _variables, context) => {
        queryClient.setQueryData(spotsQueryKey, context?.previous);
        toast.error(t("reservations.pin.error"));
      },
      onSettled: () =>
        queryClient.invalidateQueries({ queryKey: spotsQueryKey }),
    },
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
    <div className="flex h-full min-h-0 flex-col bg-background">
      <div className="space-y-2 px-3 pt-3">
        <Card className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 border-border bg-card p-2 xl:grid-cols-[minmax(14rem,1fr)_auto_auto]">
          <SearchInput
            value={searchValue}
            onChange={(event) => setSearchValue(event.target.value)}
            placeholder={t("reservations.searchPlaceholder")}
            className="h-9"
            wrapperClassName="min-w-0"
            disabled={spotsQuery.isPending}
          />
          <ReservationFilters
            value={filter}
            onChange={setFilter}
            className="col-span-2 row-start-2 xl:col-span-1 xl:col-start-2 xl:row-start-1"
          />
          <ViewModeToggle
            value={viewMode}
            onChange={setViewMode}
            listLabel={t("reservations.view.list")}
            gridLabel={t("reservations.view.grid")}
            className="col-start-2 row-start-1 xl:col-start-3"
          />
        </Card>
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
          <div className="flex flex-1 items-center justify-center px-3 pb-3">
            <Empty className="min-h-56 w-full max-w-xl">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <TriangleAlert />
                </EmptyMedia>
                <EmptyTitle>{t("reservations.error.title")}</EmptyTitle>
                <EmptyDescription>
                  {t("reservations.error.description")}
                </EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => spotsQuery.refetch()}
                >
                  {t("common.actions.retry")}
                </Button>
              </EmptyContent>
            </Empty>
          </div>
        ) : sortedSpots.length === 0 ? (
          <div className="flex flex-1 items-center justify-center px-3 pb-3">
            <Empty className="min-h-56 w-full max-w-xl">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <SearchX />
                </EmptyMedia>
                <EmptyTitle>{t("reservations.empty.title")}</EmptyTitle>
                <EmptyDescription>
                  {normalizedSearch
                    ? t("reservations.empty.searchDescription")
                    : t("reservations.empty.description")}
                </EmptyDescription>
              </EmptyHeader>
              {(normalizedSearch || filter !== "all") && (
                <EmptyContent>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSearchValue("");
                      setFilter("all");
                    }}
                  >
                    {t("reservations.empty.clearFilters")}
                  </Button>
                </EmptyContent>
              )}
            </Empty>
          </div>
        ) : (
          <ScrollArea className="min-h-0 flex-1">
            <div className={getReservationCollectionClassName(viewMode)}>
              {sortedSpots.map((spot) => (
                <ReservationCard
                  key={spot.id}
                  spot={spot}
                  viewMode={viewMode}
                  pinPending={pinMutation.isPending || unpinMutation.isPending}
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
