import { useEffect, useRef, useState } from "react";
import { addDays, differenceInCalendarDays, startOfWeek } from "date-fns";
import { keepPreviousData, useQueryClient } from "@tanstack/react-query";
import { useParams } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Permission } from "@lootlog/types";
import { resolveReservationSettings } from "@lootlog/reservations";
import {
  getListReservationSpotsQueryKey,
  getListSpotReservationsQueryKey,
  getListSpotReservationsQueryOptions,
  useDeleteReservation,
  useListSpotReservations,
} from "@lootlog/api-client/react-query/main/reservations";
import { useGuildsControllerGetGuildById } from "@lootlog/api-client/react-query/main/guilds";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@lootlog/ui/components/empty";
import { CalendarX2 } from "lucide-react";
import { Spinner } from "@lootlog/ui/components/spinner";
import { GatewayEvent } from "@/config/gateway";
import { ROUTES } from "@/config/routes";
import { useGuildPermissions } from "@/hooks/api/use-guild-permissions";
import { useGuildId } from "@/hooks/context/use-guild-id";
import { useIsOwner } from "@/hooks/context/use-is-owner";
import { useGateway } from "@/hooks/utils/use-gateway";
import { getReservationErrorMessage } from "../get-reservation-error-message";
import { DesktopWeekSchedule } from "./desktop-week-schedule";
import {
  findNearestFreeReservationRange,
  getNearestFreeReservationSearchWindow,
} from "./find-nearest-free-reservation-range";
import { getReservationSegments } from "./get-reservation-segments";
import { MobileDaySchedule } from "./mobile-day-schedule";
import { normalizeReservation } from "./normalize-reservation";
import { ReservationDetails } from "./reservation-details";
import { ReservationFormDialog } from "./reservation-form-dialog";
import {
  ceilDateToReservationStep,
  isReservationStartSelectable,
} from "./reservation-settings";
import { ScheduleHeader } from "./schedule-header";
import type { ReservationRange } from "./types";
import { useCompactScheduleLayout } from "./use-compact-schedule-layout";

type ReservationChangedPayload = {
  spotId?: string;
};

export function ReservationsSchedule() {
  const { reservationId: spotId } = useParams({
    from: "/_authenticated/$guildId/reservations/$reservationId",
  });
  const { t } = useTranslation();
  const guildId = useGuildId() ?? "";
  const { containerRef, isCompact } = useCompactScheduleLayout();
  const isOwner = useIsOwner();
  const { data: permissions } = useGuildPermissions();
  const { socket, connected } = useGateway();
  const queryClient = useQueryClient();
  const findingNearestFreeSlotRef = useRef(false);
  const [date, setDate] = useState(() => new Date());
  const [createRange, setCreateRange] = useState<ReservationRange | null>(null);
  const [isFindingNearestFreeSlot, setIsFindingNearestFreeSlot] =
    useState(false);
  const [selectedReservationId, setSelectedReservationId] = useState<
    number | null
  >(null);
  const weekStart = startOfWeek(date, { weekStartsOn: 1 });
  const weekEnd = addDays(weekStart, 7);
  const swipePreviewStart = addDays(weekStart, -1);
  const swipePreviewEnd = addDays(weekEnd, 1);
  const dayIndex = differenceInCalendarDays(date, weekStart);
  const guildQuery = useGuildsControllerGetGuildById({ guildId });
  const settings = resolveReservationSettings(guildQuery.data);
  const reservationsQuery = useListSpotReservations(
    { guildId, spotId },
    {
      from: swipePreviewStart.toISOString(),
      to: swipePreviewEnd.toISOString(),
    },
    {
      query: {
        enabled: Boolean(guildId && spotId),
        placeholderData: keepPreviousData,
        staleTime: 15_000,
      },
    },
  );
  const reservations = (reservationsQuery.data?.items ?? []).map(
    normalizeReservation,
  );
  const segments = getReservationSegments(reservations, weekStart, 1);
  const selectedReservation =
    reservations.find(({ id }) => id === selectedReservationId) ?? null;
  const canManageReservationSettings =
    isOwner ||
    Boolean(
      permissions?.includes(Permission.OWNER) ||
      permissions?.includes(Permission.ADMIN),
    );
  const cancelMutation = useDeleteReservation({
    mutation: {
      onSuccess: async (_data, variables) => {
        await Promise.all([
          queryClient.invalidateQueries({
            queryKey: getListReservationSpotsQueryKey({ guildId }),
          }),
          queryClient.invalidateQueries({
            queryKey: getListSpotReservationsQueryKey({ guildId, spotId }),
          }),
        ]);
        if (selectedReservationId === variables.pathParams.reservationId) {
          setSelectedReservationId(null);
        }
        toast.success(t("reservations.details.cancelled"));
      },
      onError: (error) => toast.error(getReservationErrorMessage(error, t)),
    },
  });
  const cancellingReservationId = cancelMutation.isPending
    ? (cancelMutation.variables?.pathParams.reservationId ?? null)
    : null;

  useEffect(() => {
    if (!connected || !guildId) return;
    const refresh = (payload: ReservationChangedPayload) => {
      if (payload.spotId && payload.spotId !== spotId) return;
      void Promise.all([
        queryClient.invalidateQueries({
          queryKey: getListReservationSpotsQueryKey({ guildId }),
        }),
        queryClient.invalidateQueries({
          queryKey: getListSpotReservationsQueryKey({ guildId, spotId }),
        }),
      ]);
    };
    socket.on(GatewayEvent.RESERVATIONS_CHANGED, refresh);
    socket.on(GatewayEvent.RESERVATIONS_CREATE, refresh);
    socket.on(GatewayEvent.RESERVATIONS_DELETE, refresh);
    return () => {
      socket.off(GatewayEvent.RESERVATIONS_CHANGED, refresh);
      socket.off(GatewayEvent.RESERVATIONS_CREATE, refresh);
      socket.off(GatewayEvent.RESERVATIONS_DELETE, refresh);
    };
  }, [connected, guildId, queryClient, socket, spotId]);

  const openDefaultRange = () => {
    const startsAt = ceilDateToReservationStep(new Date(), settings);
    setCreateRange({
      startsAt,
      endsAt: new Date(
        startsAt.getTime() + settings.reservationMinDurationMinutes * 60_000,
      ),
    });
  };

  const findNearestFreeSlot = async () => {
    if (findingNearestFreeSlotRef.current) return;
    findingNearestFreeSlotRef.current = true;
    setIsFindingNearestFreeSlot(true);
    const now = new Date();
    const searchWindow = getNearestFreeReservationSearchWindow({
      now,
      settings,
    });

    try {
      const result = await queryClient.fetchQuery(
        getListSpotReservationsQueryOptions(
          { guildId, spotId },
          {
            from: searchWindow.from.toISOString(),
            to: searchWindow.to.toISOString(),
          },
        ),
      );
      const nearestRange = findNearestFreeReservationRange({
        intervals: result.items.map(({ endsAt, startsAt }) => ({
          endsAt: new Date(endsAt),
          startsAt: new Date(startsAt),
        })),
        now,
        settings,
      });

      if (!nearestRange) {
        toast.info(t("reservations.schedule.nearestFreeSlot.unavailable"));
        return;
      }

      setDate(nearestRange.startsAt);
      setCreateRange(nearestRange);
    } catch {
      toast.error(t("reservations.schedule.nearestFreeSlot.error"));
    } finally {
      findingNearestFreeSlotRef.current = false;
      setIsFindingNearestFreeSlot(false);
    }
  };

  const openSelectedRange = (range: ReservationRange) => {
    if (!isReservationStartSelectable(range.startsAt)) return;
    setCreateRange(range);
  };

  return (
    <div
      ref={containerRef}
      className="relative flex h-full min-h-0 flex-col overflow-hidden bg-background"
    >
      <ScheduleHeader
        date={date}
        isCompact={isCompact}
        settings={settings}
        settingsHref={
          guildId
            ? ROUTES.guild.settings.reservationsSettings(guildId)
            : undefined
        }
        canManageReservationSettings={canManageReservationSettings}
        isFindingNearestFreeSlot={isFindingNearestFreeSlot}
        onPrevious={() =>
          setDate((current) => addDays(current, isCompact ? -1 : -7))
        }
        onNext={() => setDate((current) => addDays(current, isCompact ? 1 : 7))}
        onToday={() => setDate(new Date())}
        onFindNearestFreeSlot={() => void findNearestFreeSlot()}
        onAddReservation={openDefaultRange}
      />

      {reservationsQuery.isPending ? (
        <div className="flex flex-1 items-center justify-center" role="status">
          <Spinner />
          <span className="sr-only">{t("common.loading")}</span>
        </div>
      ) : reservationsQuery.isError ? (
        <Empty className="m-auto max-w-lg">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <CalendarX2 />
            </EmptyMedia>
            <EmptyTitle>{t("reservations.schedule.error.title")}</EmptyTitle>
            <EmptyDescription>
              {t("reservations.schedule.error.description")}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : isCompact ? (
        <MobileDaySchedule
          date={date}
          dayIndex={dayIndex}
          segments={segments}
          defaultDurationMinutes={settings.reservationMinDurationMinutes}
          minuteStep={settings.reservationTimeGranularityMinutes}
          onDaySwipe={(direction) =>
            setDate((current) => addDays(current, direction))
          }
          onRangeSelect={openSelectedRange}
          onReservationSelect={setSelectedReservationId}
          onReservationCancel={(reservationId) =>
            cancelMutation.mutate({ pathParams: { guildId, reservationId } })
          }
          cancellingReservationId={cancellingReservationId}
        />
      ) : (
        <DesktopWeekSchedule
          weekStart={weekStart}
          segments={segments}
          minuteStep={settings.reservationTimeGranularityMinutes}
          onRangeSelect={openSelectedRange}
          onReservationSelect={setSelectedReservationId}
          onReservationCancel={(reservationId) =>
            cancelMutation.mutate({ pathParams: { guildId, reservationId } })
          }
          cancellingReservationId={cancellingReservationId}
        />
      )}

      <ReservationFormDialog
        open={createRange !== null}
        onOpenChange={(open) => !open && setCreateRange(null)}
        guildId={guildId}
        spotId={spotId}
        settings={settings}
        initialStartsAt={createRange?.startsAt}
        initialEndsAt={createRange?.endsAt}
      />
      <ReservationDetails
        reservation={selectedReservation}
        guildId={guildId}
        spotId={spotId}
        onOpenChange={(open) => !open && setSelectedReservationId(null)}
      />
    </div>
  );
}
