import {
  CoverageGapResponse,
  HeroCoverageGapResponse,
  HeroPresenceStatsResponse,
  HeroRespawnConfigResponse,
  NullableCoverageGapResponse,
} from "#src/events/monitoring/event-monitoring-response.schema";
import { encodeUnknownResponse } from "#src/shared/schema/encode-response";
import { Effect } from "effect";
import type { EventDataOperations } from "#src/events/events.data-layer";
import { eventRequirements } from "./events-authorization.js";
import {
  stringParameter,
  type EventEndpointBuilders,
  type EventEndpointHandlers,
} from "./events-endpoint.js";

const { read, manage } = eventRequirements;

export const eventMonitoringHandlers = (
  { event }: EventEndpointBuilders,
  operations: Pick<EventDataOperations, "monitoring">,
) =>
  ({
    EventsMonitoringControllerGetHeroCoverageGaps: ({ params }) =>
      event(
        "EventsMonitoringControllerGetHeroCoverageGaps",
        read,
        params,
        (caller, eventId) =>
          Effect.flatMap(stringParameter(params.heroId, "heroId"), (heroId) =>
            operations.monitoring
              .getHeroCoverageGaps(
                caller.guild,
                eventId,
                heroId,
                [...caller.roles],
                caller.accessPolicy,
              )
              .pipe(
                Effect.map((values) =>
                  values.map((value) =>
                    encodeUnknownResponse(HeroCoverageGapResponse, value),
                  ),
                ),
              ),
          ),
      ),
    EventsMonitoringControllerGetMapCoverageGaps: ({ params }) =>
      event(
        "EventsMonitoringControllerGetMapCoverageGaps",
        read,
        params,
        (caller, eventId) =>
          Effect.flatMap(stringParameter(params.mapId, "mapId"), (mapId) =>
            operations.monitoring
              .getMapCoverageGaps(
                caller.guild,
                eventId,
                mapId,
                [...caller.roles],
                caller.accessPolicy,
              )
              .pipe(
                Effect.map((values) =>
                  values.map((value) =>
                    encodeUnknownResponse(CoverageGapResponse, value),
                  ),
                ),
              ),
          ),
      ),
    EventsMonitoringControllerGetActiveGapForMap: ({ params }) =>
      event(
        "EventsMonitoringControllerGetActiveGapForMap",
        read,
        params,
        (caller, eventId) =>
          Effect.flatMap(stringParameter(params.mapId, "mapId"), (mapId) =>
            operations.monitoring
              .getActiveGapForMap(
                caller.guild,
                eventId,
                mapId,
                [...caller.roles],
                caller.accessPolicy,
              )
              .pipe(
                Effect.map((value) =>
                  encodeUnknownResponse(NullableCoverageGapResponse, value),
                ),
              ),
          ),
      ),
    EventsMonitoringControllerGetActiveGapsForHero: ({ params }) =>
      event(
        "EventsMonitoringControllerGetActiveGapsForHero",
        read,
        params,
        (caller, eventId) =>
          Effect.flatMap(stringParameter(params.heroId, "heroId"), (heroId) =>
            operations.monitoring
              .getActiveGapsForHero(
                caller.guild,
                eventId,
                heroId,
                [...caller.roles],
                caller.accessPolicy,
              )
              .pipe(
                Effect.map((values) =>
                  values.map((value) =>
                    encodeUnknownResponse(CoverageGapResponse, value),
                  ),
                ),
              ),
          ),
      ),
    EventsMonitoringControllerGetHeroPresenceStats: ({ params }) =>
      event(
        "EventsMonitoringControllerGetHeroPresenceStats",
        read,
        params,
        (caller, eventId) =>
          Effect.flatMap(stringParameter(params.heroId, "heroId"), (heroId) =>
            operations.monitoring
              .getHeroPresenceStats(
                caller.guild,
                eventId,
                heroId,
                [...caller.roles],
                caller.accessPolicy,
              )
              .pipe(
                Effect.map((value) =>
                  encodeUnknownResponse(HeroPresenceStatsResponse, value),
                ),
              ),
          ),
      ),
    EventsMonitoringControllerGetHeroRespawnConfig: ({ params }) =>
      event(
        "EventsMonitoringControllerGetHeroRespawnConfig",
        read,
        params,
        (caller, eventId) =>
          Effect.flatMap(stringParameter(params.heroId, "heroId"), (heroId) =>
            operations.monitoring
              .getHeroRespawnConfig(
                caller.guild,
                eventId,
                heroId,
                [...caller.roles],
                caller.accessPolicy,
              )
              .pipe(
                Effect.map((value) =>
                  encodeUnknownResponse(HeroRespawnConfigResponse, value),
                ),
              ),
          ),
      ),
    EventsMonitoringControllerCloseRespawnWindow: ({ params, payload }) =>
      event(
        "EventsMonitoringControllerCloseRespawnWindow",
        manage,
        params,
        (caller, eventId) =>
          Effect.flatMap(stringParameter(params.heroId, "heroId"), (heroId) =>
            operations.monitoring.closeRespawnWindow(
              caller.guild,
              eventId,
              heroId,
              payload,
              caller.member.id,
              [...caller.roles],
              caller.accessPolicy,
            ),
          ).pipe(Effect.asVoid),
      ),
    EventsMonitoringControllerOpenRespawnWindow: ({ params, payload }) =>
      event(
        "EventsMonitoringControllerOpenRespawnWindow",
        manage,
        params,
        (caller, eventId) =>
          Effect.flatMap(stringParameter(params.heroId, "heroId"), (heroId) =>
            operations.monitoring.openRespawnWindow(
              caller.guild,
              eventId,
              heroId,
              payload,
              caller.member.id,
              [...caller.roles],
              caller.accessPolicy,
            ),
          ).pipe(Effect.asVoid),
      ),
  }) satisfies EventEndpointHandlers;
