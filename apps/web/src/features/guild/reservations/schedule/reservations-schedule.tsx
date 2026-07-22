import { useParams } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { TooltipProvider } from "@lootlog/ui/components/tooltip";
import {
  getReservationsCacheSnapshot,
  removeReservationFromReservationsCache,
  reservationsCacheQueryKey,
  reservationsQueryOptions,
  restoreReservationsCacheSnapshot,
  type ReservationsCacheMutationContext,
} from "../reservations-api";
import { useSession } from "@/hooks/auth/use-session";
import { useIsOwner } from "@/hooks/context/use-is-owner";
import { useGuildId } from "@/hooks/context/use-guild-id";
import { useGateway } from "@/hooks/utils/use-gateway";
import { GatewayEvent } from "@/config/gateway";
import { ROUTES } from "@/config/routes";
import { toast } from "sonner";
import { reservationSlug } from "../reservation-slug";
import { Permission } from "@lootlog/types";

import { ScheduleHeader } from "./schedule-header";
import { ScheduleGrid } from "./schedule-grid";
import { CreateReservationDialog } from "./create-reservation-dialog";
import { useScheduleNavigation } from "./use-schedule-navigation";
import { getReservationSegments } from "./get-reservation-segments";
import { getApiErrorMessage } from "@/features/guild/events/utils/get-api-error-message";
import { normalizeReservation } from "./normalize-reservation";
import {
  invalidateReservationsControllerGetReservations,
  useReservationsControllerDeleteReservation,
  useReservationsControllerGetReservations,
} from "@/lib/api/generated/main/reservations/reservations";
import { useGuildPermissions } from "@/hooks/api/use-guild-permissions";
import { useMembersControllerGetGuildMemberReferences } from "@/lib/api/generated/main/members/members";
import type { MemberReferenceResponseDtoOutput as GuildMember } from "@/lib/api/generated/main/model";
import { useGuildsControllerGetGuildById } from "@/lib/api/generated/main/guilds/guilds";
import { getReservationSettings } from "./reservation-settings";

export const ReservationsSchedule: React.FC = () => {
  const { reservationId } = useParams({
    from: "/_authenticated/$guildId/reservations/$reservationId",
  });
  const { data: session } = useSession();
  const isOwner = useIsOwner();
  const guildId = useGuildId();
  const { data: members } = useMembersControllerGetGuildMemberReferences(
    {
      guildId: guildId ?? "",
    },
    {
      includeInactive: true,
    },
  );
  const { data: permissions } = useGuildPermissions();
  const { socket, connected } = useGateway();
  const queryClient = useQueryClient();
  const { data: guild } = useGuildsControllerGetGuildById({
    guildId: guildId ?? "",
  });
  const reservationSettings = getReservationSettings(guild);

  const { data: reservations } = useReservationsControllerGetReservations(
    { guildId: guildId ?? "" },
    {
      query: {
        ...reservationsQueryOptions(guildId ?? ""),
      },
    },
  );
  const deleteReservationMutation = useReservationsControllerDeleteReservation<
    unknown,
    ReservationsCacheMutationContext
  >({
    mutation: {
      onMutate: async (variables) => {
        if (!guildId) {
          return {
            previousReservations: undefined,
          };
        }

        await queryClient.cancelQueries({
          queryKey: reservationsCacheQueryKey(guildId),
        });

        const previousReservations = getReservationsCacheSnapshot(
          queryClient,
          guildId,
        );

        removeReservationFromReservationsCache(
          queryClient,
          guildId,
          variables.pathParams.reservationRecordId,
        );

        return {
          previousReservations,
        };
      },
      onSuccess: async (reservation) => {
        if (!guildId) {
          return;
        }

        removeReservationFromReservationsCache(
          queryClient,
          guildId,
          reservation.id,
        );

        await invalidateReservationsControllerGetReservations(queryClient, {
          guildId,
        });
      },
      onError: (_error, _variables, mutationContext) => {
        if (!guildId) {
          return;
        }

        restoreReservationsCacheSnapshot(
          queryClient,
          guildId,
          mutationContext?.previousReservations,
        );
      },
    },
  });
  const deleteReservation = deleteReservationMutation.mutateAsync;
  const isDeleting = deleteReservationMutation.isPending;

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const currentUserId = session?.user?.discordId;

  const {
    currentYear,
    currentWeek,
    weekStart,
    monthName,
    handlePrevWeek,
    handleNextWeek,
  } = useScheduleNavigation();

  const canModerateReservations =
    isOwner ||
    Boolean(
      permissions?.includes(Permission.LOOTLOG_MANAGE) ||
      permissions?.includes(Permission.ADMIN),
    );

  const canManageReservationSettings =
    isOwner ||
    Boolean(
      permissions?.includes(Permission.OWNER) ||
      permissions?.includes(Permission.ADMIN),
    );

  const reservationSettingsHref = guildId
    ? ROUTES.guild.settings.reservationsSettings(guildId)
    : undefined;

  const normalizedReservationId = reservationId
    ? reservationSlug(reservationId)
    : undefined;

  const RESERVATION_NAME_BY_SLUG: Record<string, string> = Object.keys(
    reservations ?? {},
  ).reduce<Record<string, string>>((acc, name) => {
    acc[reservationSlug(name)] = name;
    return acc;
  }, {});

  const reservationKey = normalizedReservationId
    ? (RESERVATION_NAME_BY_SLUG[normalizedReservationId] ??
      Object.keys(reservations ?? {}).find(
        (name) => reservationSlug(name) === normalizedReservationId,
      ) ??
      Object.keys(reservations ?? {}).find(
        (name) => name.toLowerCase() === reservationId?.toLowerCase(),
      ))
    : undefined;

  const createReservationKey =
    reservationKey ?? normalizedReservationId ?? reservationId ?? "";

  const selectedReservations = reservationKey
    ? (reservations?.[reservationKey] ?? [])
    : [];

  const normalizedReservations = selectedReservations.map(normalizeReservation);

  const segments = getReservationSegments(normalizedReservations, weekStart);

  type ReservationGatewayPayload = {
    guildId: string;
    reservation: {
      reservationId: string;
    };
  };

  useEffect(() => {
    if (!guildId || !connected) {
      return;
    }

    const handleReservationEvent = (payload: ReservationGatewayPayload) => {
      if (payload.guildId !== guildId) {
        return;
      }

      void queryClient.invalidateQueries({
        queryKey: reservationsCacheQueryKey(guildId),
      });
    };

    socket.on(GatewayEvent.RESERVATIONS_CREATE, handleReservationEvent);
    socket.on(GatewayEvent.RESERVATIONS_DELETE, handleReservationEvent);

    return () => {
      socket.off(GatewayEvent.RESERVATIONS_CREATE, handleReservationEvent);
      socket.off(GatewayEvent.RESERVATIONS_DELETE, handleReservationEvent);
    };
  }, [connected, guildId, queryClient, socket]);

  const handleDeleteReservation = async (
    reservationRecordId: number,
    action: "cancel" | "remove",
  ) => {
    const successMessage =
      action === "cancel"
        ? "Rezerwacja została anulowana."
        : "Rezerwacja została usunięta.";
    const fallbackMessage =
      action === "cancel"
        ? "Nie udało się anulować rezerwacji."
        : "Nie udało się usunąć rezerwacji.";

    try {
      if (!guildId) {
        throw new Error("Missing guild id when deleting reservation.");
      }

      await deleteReservation({
        pathParams: { guildId, reservationRecordId },
      });
      toast.success(successMessage, { position: "bottom-right" });
    } catch (error) {
      toast.error(getApiErrorMessage(error) ?? fallbackMessage, {
        position: "bottom-right",
      });
    }
  };

  const membersByUserId = new Map<string, GuildMember>(
    members?.map((member) => [member.userId, member]) ?? [],
  );

  return (
    <TooltipProvider>
      <div className="flex flex-col h-full min-h-0 max-h-full overflow-hidden">
        <ScheduleHeader
          currentWeek={currentWeek}
          currentYear={currentYear}
          monthName={monthName}
          settings={reservationSettings}
          settingsHref={reservationSettingsHref}
          canManageReservationSettings={canManageReservationSettings}
          onPrevWeek={handlePrevWeek}
          onNextWeek={handleNextWeek}
          onAddReservation={() => setIsCreateDialogOpen(true)}
        />

        <CreateReservationDialog
          open={isCreateDialogOpen}
          onOpenChange={setIsCreateDialogOpen}
          reservationKey={createReservationKey}
          currentUserId={currentUserId}
          settings={reservationSettings}
        />

        <div className="flex-1 flex flex-col min-h-0 max-h-full h-full overflow-hidden bg-transparent">
          <ScheduleGrid
            weekStart={weekStart}
            segments={segments}
            membersByUserId={membersByUserId}
            currentUserId={currentUserId}
            canModerateReservations={canModerateReservations}
            isDeleting={isDeleting}
            onDeleteReservation={handleDeleteReservation}
            reservationKey={createReservationKey}
            settings={reservationSettings}
          />
        </div>
      </div>
    </TooltipProvider>
  );
};
