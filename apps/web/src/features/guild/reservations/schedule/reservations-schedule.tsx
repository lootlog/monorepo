import { useParams } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useState } from "react";

import { useGuildMembers } from "@/hooks/api/members/use-guild-members";
import { useGuildPermissions } from "@/hooks/api/guilds/use-guild-permissions";
import { TooltipProvider } from "@lootlog/ui/components/tooltip";
import type { GuildMember } from "@/hooks/api/members/use-guild-member";
import { useReservations } from "@/hooks/api/reservations/use-reservations";
import { useDeleteReservation } from "@/hooks/api/reservations/use-delete-reservation";
import { useSession } from "@/hooks/auth/use-session";
import { useIsOwner } from "@/hooks/context/use-is-owner";
import { useGuildId } from "@/hooks/context/use-guild-id";
import { useGateway } from "@/hooks/utils/use-gateway";
import { GatewayEvent } from "@/config/gateway";
import { toast } from "sonner";
import { reservationSlug } from "../reservation-slug";
import { Permission } from "@lootlog/types";

import { ScheduleHeader } from "./schedule-header";
import { ScheduleGrid } from "./schedule-grid";
import { CreateReservationDialog } from "./create-reservation-dialog";
import { useScheduleNavigation } from "./use-schedule-navigation";
import { useReservationSegments } from "./use-reservation-segments";
import { getApiErrorMessage } from "@/features/guild/events/utils/get-api-error-message";
import { queryKeys } from "@/lib/query-keys";

export const ReservationsSchedule: React.FC = () => {
  const { reservationId } = useParams({
    from: "/_authenticated/$guildId/reservations/$reservationId",
  });
  const { data: members } = useGuildMembers(false);
  const { data: session } = useSession();
  const { data: permissions } = useGuildPermissions();
  const isOwner = useIsOwner();
  const guildId = useGuildId();
  const { socket, connected } = useGateway();
  const queryClient = useQueryClient();

  const { data: reservations } = useReservations();
  const { mutateAsync: deleteReservation, isPending: isDeleting } =
    useDeleteReservation();

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

  const canModerateReservations = useMemo(() => {
    if (isOwner) {
      return true;
    }

    if (!permissions) {
      return false;
    }

    return (
      permissions.includes(Permission.LOOTLOG_MANAGE) ||
      permissions.includes(Permission.ADMIN)
    );
  }, [permissions, isOwner]);

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

  const segments = useReservationSegments(selectedReservations, weekStart);

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
        queryKey: queryKeys.reservations.all(guildId),
      });
    };

    socket.on(GatewayEvent.RESERVATIONS_CREATE, handleReservationEvent);
    socket.on(GatewayEvent.RESERVATIONS_DELETE, handleReservationEvent);

    return () => {
      socket.off(GatewayEvent.RESERVATIONS_CREATE, handleReservationEvent);
      socket.off(GatewayEvent.RESERVATIONS_DELETE, handleReservationEvent);
    };
  }, [connected, guildId, queryClient, socket]);

  const handleDeleteReservation = useCallback(
    async (reservationRecordId: number, action: "cancel" | "remove") => {
      const successMessage =
        action === "cancel"
          ? "Rezerwacja została anulowana."
          : "Rezerwacja została usunięta.";
      const fallbackMessage =
        action === "cancel"
          ? "Nie udało się anulować rezerwacji."
          : "Nie udało się usunąć rezerwacji.";

      try {
        await deleteReservation({ reservationRecordId });
        toast.success(successMessage, { position: "bottom-right" });
      } catch (error) {
        toast.error(getApiErrorMessage(error) ?? fallbackMessage, {
          position: "bottom-right",
        });
      }
    },
    [deleteReservation],
  );

  const membersByUserId = useMemo(() => {
    if (!members) {
      return new Map<string, GuildMember>();
    }

    return new Map<string, GuildMember>(
      members.map((member) => [member.userId, member]),
    );
  }, [members]);

  return (
    <TooltipProvider>
      <div className="flex flex-col h-full min-h-0 max-h-full overflow-hidden">
        <ScheduleHeader
          currentWeek={currentWeek}
          currentYear={currentYear}
          monthName={monthName}
          onPrevWeek={handlePrevWeek}
          onNextWeek={handleNextWeek}
          onAddReservation={() => setIsCreateDialogOpen(true)}
        />

        <CreateReservationDialog
          open={isCreateDialogOpen}
          onOpenChange={setIsCreateDialogOpen}
          reservationKey={createReservationKey}
          currentUserId={currentUserId}
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
          />
        </div>
      </div>
    </TooltipProvider>
  );
};
