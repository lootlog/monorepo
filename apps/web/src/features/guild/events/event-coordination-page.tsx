import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useParams } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { AlertCircle, Crosshair } from "lucide-react";
import { toast } from "sonner";
import { Permission } from "@lootlog/types";
import { Button } from "@lootlog/ui/components/button";
import { Card } from "@lootlog/ui/components/card";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import { Spinner } from "@lootlog/ui/components/spinner";
import { useGuildPermissions } from "@/hooks/api/use-guild-permissions";
import {
  getEventsMonitoringControllerGetCoordinationQueryKey,
  invalidateEventsMonitoringControllerGetCoordination,
  useEventsAssignmentControllerSelfAssignMember,
  useEventsMonitoringControllerCloseRespawnWindow,
  useEventsMonitoringControllerGetCoordination,
} from "@lootlog/api-client/react-query/main/events";
import { EventActionDialog } from "./components/dialogs/event-action-dialog";
import { EventCoordinationHeroCard } from "./components/coordination/event-coordination-hero-card";
import { EventCoordinationSummaryCard } from "./components/coordination/event-coordination-summary-card";
import { invalidateMapQueries } from "./hooks/mutations/invalidate-map-queries";
import { invalidateRespawnQueries } from "./hooks/mutations/invalidate-respawn-queries";
import { invalidateKillQueries } from "./hooks/mutations/invalidate-kill-queries";
import { getAssignmentAvailability } from "./utils/get-assignment-availability";
import type { EventCoordinationResponseDtoHeroesItem } from "@lootlog/api-client/models/main/event-coordination-response-dto-heroes-item";

const getRouteId = (value: string | undefined) => value ?? "";

const hasAnyPermission = (
  permissions: readonly string[] | undefined,
  allowed: readonly string[],
) => allowed.some((permission) => permissions?.includes(permission));

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

  const { data: permissions } = useGuildPermissions();
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
        await Promise.all([
          invalidateEventsMonitoringControllerGetCoordination(queryClient, {
            guildId: variables.pathParams.guildId,
            eventId: variables.pathParams.eventId,
          }),
          Promise.resolve(
            invalidateMapQueries(
              queryClient,
              variables.pathParams.guildId,
              variables.pathParams.eventId,
              variables.pathParams.mapId,
            ),
          ),
        ]);
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
          invalidateEventsMonitoringControllerGetCoordination(queryClient, {
            guildId: variables.pathParams.guildId,
            eventId: variables.pathParams.eventId,
          }),
          Promise.resolve(
            invalidateRespawnQueries(
              queryClient,
              variables.pathParams.guildId,
              variables.pathParams.eventId,
              variables.pathParams.heroId,
            ),
          ),
          Promise.resolve(
            invalidateKillQueries(
              queryClient,
              variables.pathParams.guildId,
              variables.pathParams.eventId,
            ),
          ),
        ]);
      },
      onSettled: () => {
        setClosingHero(null);
      },
    },
  });

  const canWrite = hasAnyPermission(permissions, [
    Permission.LOOTLOG_EVENTS_WRITE,
    Permission.LOOTLOG_EVENTS_MANAGE,
    Permission.ADMIN,
    Permission.OWNER,
  ]);
  const canManage = hasAnyPermission(permissions, [
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
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  if (error || !coordination) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <AlertCircle className="w-12 h-12 text-destructive" />
        <p className="text-muted-foreground">
          {t("events.coordination.error")}
        </p>
        <Button variant="outline" onClick={() => void refetch()}>
          {t("common.routeErrors.actions.retry")}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
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
        <div className="px-3 py-3 flex flex-col gap-4">
          <EventCoordinationSummaryCard coordination={coordination} />

          {coordination.heroes.length === 0 ? (
            <Card className="flex flex-col items-center justify-center gap-3 bg-card py-12">
              <Crosshair className="w-12 h-12 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground">
                {t("events.coordination.empty")}
              </p>
            </Card>
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
