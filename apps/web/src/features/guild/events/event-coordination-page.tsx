import { EmptyState } from "@/components/common/empty-state";
import type { AccessPolicy, Capability } from "@lootlog/domain/access-policy";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useParams } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Crosshair } from "lucide-react";
import { toast } from "sonner";
import { Permission } from "@lootlog/schema/permissions";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import { useGuildPermissions } from "@/hooks/api/use-guild-permissions";
import {
  getEventsMonitoringControllerGetCoordinationQueryKey,
  useEventsAssignmentControllerSelfAssignMember,
  useEventsMonitoringControllerCloseRespawnWindow,
  useEventsMonitoringControllerGetCoordination,
  type EventCoordinationResponseDtoHeroesItem,
} from "@lootlog/client/main";
import { EventActionDialog } from "./components/dialogs/event-action-dialog";
import { EventLoadError } from "./components/event-load-error";
import { EventCoordinationSkeleton } from "./event-coordination-skeleton";
import { EventCoordinationHeroCard } from "./components/coordination/event-coordination-hero-card";
import { EventCoordinationSummaryCard } from "./components/coordination/event-coordination-summary-card";
import { invalidateMapQueries } from "./hooks/mutations/invalidate-map-queries";
import { invalidateRespawnQueries } from "./hooks/mutations/invalidate-respawn-queries";
import { invalidateKillQueries } from "./hooks/mutations/invalidate-kill-queries";
import { getAssignmentAvailability } from "./utils/get-assignment-availability";

const getRouteId = (value: string | undefined) => value ?? "";

const hasAnyPermission = (
  accessPolicy: AccessPolicy | undefined,
  allowed: readonly Capability[],
) => accessPolicy?.allowsAny(allowed) ?? false;

export const EventCoordinationPage = () => {
  const { t } = useTranslation();
  const { guildId, eventId } = useParams({ strict: false });
  const queryClient = useQueryClient();
  const [assigningMapId, setAssigningMapId] = useState<string | null>(null);

  const [closingHero, setClosingHero] =
    useState<EventCoordinationResponseDtoHeroesItem | null>(null);

  const hasEventRouteParams = Boolean(guildId && eventId);
  const resolvedGuildId = getRouteId(guildId);
  const resolvedEventId = getRouteId(eventId);

  const { data: accessPolicy } = useGuildPermissions();

  const {
    data: coordination,
    isPending,
    error,
    refetch,
  } = useEventsMonitoringControllerGetCoordination(
    {
      guildId: resolvedGuildId,
      eventId: resolvedEventId,
    },
    {
      query: {
        enabled: hasEventRouteParams,
        queryKey: getEventsMonitoringControllerGetCoordinationQueryKey({
          guildId: resolvedGuildId,
          eventId: resolvedEventId,
        }),
      },
    },
  );

  const selfAssign = useEventsAssignmentControllerSelfAssignMember({
    mutation: {
      onSuccess: async (_data, variables) => {
        await invalidateMapQueries(
          queryClient,
          variables.pathParams.guildId,
          variables.pathParams.eventId,
          variables.pathParams.mapId,
        );
      },
      onSettled: () => {
        setAssigningMapId(null);
      },
    },
  });

  const closeRespawnWindow = useEventsMonitoringControllerCloseRespawnWindow({
    mutation: {
      onSuccess: async (_data, variables) => {
        await Promise.all([
          invalidateRespawnQueries(
            queryClient,
            variables.pathParams.guildId,
            variables.pathParams.eventId,
            variables.pathParams.heroId,
          ),
          invalidateKillQueries(
            queryClient,
            variables.pathParams.guildId,
            variables.pathParams.eventId,
            { invalidateCoordination: false },
          ),
        ]);
      },
      onSettled: () => {
        setClosingHero(null);
      },
    },
  });

  const canWrite = hasAnyPermission(accessPolicy, [
    Permission.LOOTLOG_EVENTS_WRITE,
    Permission.LOOTLOG_EVENTS_MANAGE,
    Permission.ADMIN,
    Permission.OWNER,
  ]);

  const canManage = hasAnyPermission(accessPolicy, [
    Permission.LOOTLOG_MANAGE,
    Permission.LOOTLOG_EVENTS_MANAGE,
    Permission.ADMIN,
    Permission.OWNER,
  ]);

  const handleSelfAssign = async (
    mapId: string,
    hero: EventCoordinationResponseDtoHeroesItem,
  ) => {
    if (!guildId || !eventId) return;

    const assignmentAvailability = getAssignmentAvailability({
      assignmentTimeoutMinutes: coordination?.assignmentTimeoutMinutes ?? 5,
      timer: hero.timer,
    });

    if (!assignmentAvailability.allowed) {
      toast.error(t("events.maps.assignError"));

      return;
    }

    try {
      setAssigningMapId(mapId);
      await selfAssign.mutateAsync({
        pathParams: {
          guildId,
          eventId,
          mapId,
        },
      });
      toast.success(t("events.coordination.toasts.selfAssignSuccess"));
    } catch {
      toast.error(t("events.coordination.toasts.selfAssignError"));
      setAssigningMapId(null);
    }
  };

  const handleCloseWindow = async () => {
    if (!guildId || !eventId || !closingHero) return;

    try {
      await closeRespawnWindow.mutateAsync({
        pathParams: {
          guildId,
          eventId,
          heroId: closingHero.heroId,
        },
        data: {
          createNewWindow: false,
        },
      });
      toast.success(t("events.respawn.closeSuccess"));
    } catch {
      toast.error(t("events.respawn.closeError"));
      setClosingHero(null);
    }
  };

  if (isPending) {
    return <EventCoordinationSkeleton />;
  }

  if (error || !coordination) {
    return (
      <EventLoadError
        backTo="event"
        guildId={resolvedGuildId}
        eventId={resolvedEventId}
        error={error}
        titles={{ 500: t("events.coordination.error") }}
        onRetry={() => refetch()}
      />
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <EventActionDialog
        open={closingHero !== null}
        onOpenChange={(open) => {
          if (!open) {
            setClosingHero(null);
          }
        }}
        eventName={closingHero?.npcName ?? ""}
        onConfirm={handleCloseWindow}
        isPending={closeRespawnWindow.isPending}
        titleKey="events.coordination.closeDialog.title"
        descriptionKey="events.coordination.closeDialog.description"
        actionLabelKey="events.coordination.actions.close_window"
        variant="destructive"
      />

      <ScrollArea className="flex-1 min-h-0">
        <div className="flex flex-col gap-3 px-3 py-3">
          <EventCoordinationSummaryCard coordination={coordination} />

          {coordination.heroes.length === 0 ? (
            <EmptyState
              framed
              icon={Crosshair}
              title={t("events.coordination.empty")}
            />
          ) : (
            <div className="flex flex-col gap-3">
              {coordination.heroes.map((hero) => (
                <EventCoordinationHeroCard
                  key={hero.heroId}
                  hero={hero}
                  guildId={resolvedGuildId}
                  eventId={resolvedEventId}
                  assignmentTimeoutMinutes={
                    coordination.assignmentTimeoutMinutes
                  }
                  canWrite={canWrite}
                  canManage={canManage}
                  assigningMapId={assigningMapId}
                  closingHeroId={
                    closeRespawnWindow.isPending
                      ? (closingHero?.heroId ?? null)
                      : null
                  }
                  onSelfAssign={handleSelfAssign}
                  onCloseWindow={setClosingHero}
                />
              ))}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};
