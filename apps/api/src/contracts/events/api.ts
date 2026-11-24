import { HttpErrorResponse } from "@lootlog/protocol/http/errors";
import {
  HttpApiEndpoint,
  HttpApiGroup,
  HttpApiSchema,
  OpenApi,
} from "effect/http-api";
import { BearerSecurityMiddleware } from "#src/contracts/api-shared";
import {
  AcknowledgeExpiredParticipationConfirmationsResponse,
  EventPath,
  AcknowledgeExpiredParticipationConfirmationsRequest,
  ConfirmParticipationForKillResponse,
  EventKillPath,
  EventMutationResponse,
  EventOrganizationPath,
  CreateEventRequest,
  CreateEventHeroRequest,
  EventMapResponse,
  EventHeroPath,
  CreateEventMapRequest,
  EventHeroMapPath,
  AssignEventMapLocationRequest,
  EventMapPath,
  AssignEventMemberRequest,
  CreateEventLocationRequest,
  EventLocationPath,
  ReorderEventLocationsRequest,
  UnassignEventMemberQuery,
  UpdateEventHeroRequest,
  UpdateEventLocationRequest,
  CloseRespawnWindowRequest,
  ActiveCoverageGapResponse,
  CoverageGapsResponse,
  HeroCoverageGapsResponse,
  HeroPresenceStatsResponse,
  HeroRespawnConfigResponse,
  EventKillTimelineResponse,
  EventHeroKillPath,
  OpenRespawnWindowRequest,
  EventHeroStatsListResponse,
  EventKillDetailResponse,
  EventKillPointPath,
  UpdateKillPointRequest,
  EventTimersResponse,
  EventTimersQuery,
  EventMapsResponse,
  EventRankingResponse,
  EventListResponse,
  EventListQuery,
  PendingParticipationConfirmationsResponse,
  PinnedEventsResponse,
  PinnedEventResponse,
  EventOverviewResponse,
  EventWrappedResponse,
  UpdateEventRequest,
  EventRankingPath,
  UpdateRankingPointsRequest,
} from "./schemas.js";
import { SuccessResponse } from "#src/contracts/shared";
import { Schema } from "effect";
import {
  KillHistoryQuery,
  KillHistoryResponse,
} from "#src/events/history/event-kill-history.schema";

export class EventsGroup extends HttpApiGroup.make("events").add(
  HttpApiEndpoint.get("listEvents", "/guilds/:guildId/events", {
    params: EventOrganizationPath,
    query: EventListQuery,
    success: EventListResponse,
  })
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "listEvents")
    .annotate(OpenApi.Summary, "List guild events"),
  HttpApiEndpoint.post("createEvent", "/guilds/:guildId/events", {
    params: EventOrganizationPath,
    payload: CreateEventRequest,
    success: EventMutationResponse.pipe(HttpApiSchema.status(201)),
    error: [
      HttpErrorResponse.pipe(HttpApiSchema.status(403)),
      HttpErrorResponse.pipe(HttpApiSchema.status(400)),
    ],
  })
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "createEvent")
    .annotate(OpenApi.Summary, "Create event"),
  HttpApiEndpoint.get("showEvent", "/guilds/:guildId/events/:eventId", {
    params: EventPath,
    success: EventOverviewResponse,
    error: HttpErrorResponse.pipe(HttpApiSchema.status(404)),
  })
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "showEvent")
    .annotate(OpenApi.Summary, "Get event details"),
  HttpApiEndpoint.delete("deleteEvent", "/guilds/:guildId/events/:eventId", {
    params: EventPath,
    success: SuccessResponse,
    error: HttpErrorResponse.pipe(HttpApiSchema.status(404)),
  })
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "deleteEvent")
    .annotate(OpenApi.Summary, "Delete event"),
  HttpApiEndpoint.patch("updateEvent", "/guilds/:guildId/events/:eventId", {
    params: EventPath,
    payload: UpdateEventRequest,
    success: EventMutationResponse,
    error: [
      HttpErrorResponse.pipe(HttpApiSchema.status(404)),
      HttpErrorResponse.pipe(HttpApiSchema.status(400)),
    ],
  })
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "updateEvent")
    .annotate(OpenApi.Summary, "Update event")
    .annotate(
      OpenApi.Description,
      "heroNpcs lists every hero and map the event should have: heroes are matched by npcName and maps by mapId, so retained ones keep their kills and tracking history. It can add heroes and maps and rename maps; a list that omits an existing hero or map is rejected. Remove them with the hero and map delete operations.",
    ),
  HttpApiEndpoint.get(
    "showEventWrapped",
    "/guilds/:guildId/events/:eventId/wrapped",
    {
      params: EventPath,
      success: EventWrappedResponse,
      error: HttpErrorResponse.pipe(HttpApiSchema.status(404)),
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "showEventWrapped")
    .annotate(OpenApi.Summary, "Get event wrapped summary")
    .annotate(
      OpenApi.Description,
      "Get cached event wrapped summary with loot, coverage and member highlights",
    ),
  HttpApiEndpoint.get(
    "listEventMaps",
    "/guilds/:guildId/events/:eventId/maps",
    {
      params: EventPath,
      success: EventMapsResponse,
      error: HttpErrorResponse.pipe(HttpApiSchema.status(404)),
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "listEventMaps")
    .annotate(OpenApi.Summary, "Get event maps")
    .annotate(OpenApi.Description, "Map assignments grouped by hero."),
  HttpApiEndpoint.post(
    "recalculateEventPoints",
    "/guilds/:guildId/events/:eventId/recalculate-points",
    {
      params: EventPath,
      success: SuccessResponse,
      error: HttpErrorResponse.pipe(HttpApiSchema.status(404)),
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "recalculateEventPoints")
    .annotate(OpenApi.Summary, "Recalculate event points")
    .annotate(
      OpenApi.Description,
      "Recalculates every kill's points with the current rules.",
    ),
  HttpApiEndpoint.post(
    "EventsAssignmentControllerAssignMember",
    "/guilds/:guildId/events/:eventId/maps/:mapId/assign",
    {
      params: EventMapPath,
      payload: AssignEventMemberRequest,
      success: HttpApiSchema.Empty(200),
      error: HttpErrorResponse.pipe(HttpApiSchema.status(404)),
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "EventsAssignmentController_assignMember")
    .annotate(OpenApi.Summary, "Assign member to map"),
  HttpApiEndpoint.delete(
    "EventsAssignmentControllerUnassignMember",
    "/guilds/:guildId/events/:eventId/maps/:mapId/assign",
    {
      params: EventMapPath,
      query: UnassignEventMemberQuery,
      success: HttpApiSchema.Empty(200),
      error: HttpErrorResponse.pipe(HttpApiSchema.status(404)),
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "EventsAssignmentController_unassignMember")
    .annotate(OpenApi.Summary, "Unassign member from map")
    .annotate(
      OpenApi.Description,
      "Removes the member given by `memberId`, or every assigned member when it is omitted.",
    ),
  HttpApiEndpoint.post(
    "EventsAssignmentControllerSelfAssignMember",
    "/guilds/:guildId/events/:eventId/maps/:mapId/self-assign",
    {
      params: EventMapPath,
      success: HttpApiSchema.Empty(200),
      error: HttpErrorResponse.pipe(HttpApiSchema.status(404)),
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "EventsAssignmentController_selfAssignMember")
    .annotate(OpenApi.Summary, "Self-assign to map"),
  HttpApiEndpoint.delete(
    "EventsAssignmentControllerSelfUnassignMember",
    "/guilds/:guildId/events/:eventId/maps/:mapId/self-assign",
    {
      params: EventMapPath,
      success: HttpApiSchema.Empty(200),
      error: HttpErrorResponse.pipe(HttpApiSchema.status(404)),
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(
      OpenApi.Identifier,
      "EventsAssignmentController_selfUnassignMember",
    )
    .annotate(OpenApi.Summary, "Self-unassign from map"),
  HttpApiEndpoint.post(
    "EventsAssignmentControllerAddHero",
    "/guilds/:guildId/events/:eventId/heroes",
    {
      params: EventPath,
      payload: CreateEventHeroRequest,
      success: HttpApiSchema.Empty(201),
      error: [
        HttpErrorResponse.pipe(HttpApiSchema.status(404)),
        HttpErrorResponse.pipe(HttpApiSchema.status(409)),
      ],
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "EventsAssignmentController_addHero")
    .annotate(OpenApi.Summary, "Add hero to event")
    .annotate(
      OpenApi.Description,
      "Rejected with 409 when another hero or ranking entries in the event already use the name.",
    ),
  HttpApiEndpoint.delete(
    "EventsAssignmentControllerDeleteHero",
    "/guilds/:guildId/events/:eventId/heroes/:heroId",
    {
      params: EventHeroPath,
      success: HttpApiSchema.Empty(200),
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "EventsAssignmentController_deleteHero")
    .annotate(OpenApi.Summary, "Delete hero")
    .annotate(
      OpenApi.Description,
      "Remove a hero from the event together with its maps, kills, kill points, tracking history and ranking entries",
    ),
  HttpApiEndpoint.patch(
    "EventsAssignmentControllerUpdateHero",
    "/guilds/:guildId/events/:eventId/heroes/:heroId",
    {
      params: EventHeroPath,
      payload: UpdateEventHeroRequest,
      success: HttpApiSchema.Empty(200),
      error: [
        HttpErrorResponse.pipe(HttpApiSchema.status(404)),
        HttpErrorResponse.pipe(HttpApiSchema.status(409)),
      ],
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "EventsAssignmentController_updateHero")
    .annotate(OpenApi.Summary, "Update hero")
    .annotate(
      OpenApi.Description,
      "Renaming moves the hero's ranking entries to the new name and is rejected with 409 when another hero or ranking entries in the event already use that name.",
    ),
  HttpApiEndpoint.post(
    "EventsAssignmentControllerAddMap",
    "/guilds/:guildId/events/:eventId/heroes/:heroId/maps",
    {
      params: EventHeroPath,
      payload: CreateEventMapRequest,
      success: EventMapResponse.pipe(HttpApiSchema.status(201)),
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "EventsAssignmentController_addMap")
    .annotate(OpenApi.Summary, "Add map to hero"),
  HttpApiEndpoint.delete(
    "EventsAssignmentControllerDeleteMap",
    "/guilds/:guildId/events/:eventId/heroes/:heroId/maps/:mapId",
    {
      params: EventHeroMapPath,
      success: HttpApiSchema.Empty(200),
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "EventsAssignmentController_deleteMap")
    .annotate(OpenApi.Summary, "Delete map"),
  HttpApiEndpoint.get(
    "EventsAssignmentControllerGetLocations",
    "/guilds/:guildId/events/:eventId/heroes/:heroId/locations",
    {
      params: EventHeroPath,
      success: HttpApiSchema.Empty(200),
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "EventsAssignmentController_getLocations")
    .annotate(OpenApi.Summary, "Get hero locations")
    .annotate(OpenApi.Description, "Each location includes its maps."),
  HttpApiEndpoint.post(
    "EventsAssignmentControllerCreateLocation",
    "/guilds/:guildId/events/:eventId/heroes/:heroId/locations",
    {
      params: EventHeroPath,
      payload: CreateEventLocationRequest,
      success: HttpApiSchema.Empty(201),
      error: HttpErrorResponse.pipe(HttpApiSchema.status(400)),
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "EventsAssignmentController_createLocation")
    .annotate(OpenApi.Summary, "Create location")
    .annotate(OpenApi.Description, "Locations group a hero's maps."),
  HttpApiEndpoint.delete(
    "EventsAssignmentControllerDeleteLocation",
    "/guilds/:guildId/events/:eventId/heroes/:heroId/locations/:locationId",
    {
      params: EventLocationPath,
      success: HttpApiSchema.Empty(200),
      error: HttpErrorResponse.pipe(HttpApiSchema.status(404)),
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "EventsAssignmentController_deleteLocation")
    .annotate(OpenApi.Summary, "Delete location")
    .annotate(OpenApi.Description, "Its maps become ungrouped."),
  HttpApiEndpoint.patch(
    "EventsAssignmentControllerUpdateLocation",
    "/guilds/:guildId/events/:eventId/heroes/:heroId/locations/:locationId",
    {
      params: EventLocationPath,
      payload: UpdateEventLocationRequest,
      success: HttpApiSchema.Empty(200),
      error: HttpErrorResponse.pipe(HttpApiSchema.status(404)),
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "EventsAssignmentController_updateLocation")
    .annotate(OpenApi.Summary, "Rename location"),
  HttpApiEndpoint.post(
    "EventsAssignmentControllerReorderLocations",
    "/guilds/:guildId/events/:eventId/heroes/:heroId/locations/reorder",
    {
      params: EventHeroPath,
      payload: ReorderEventLocationsRequest,
      success: HttpApiSchema.Empty(200),
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "EventsAssignmentController_reorderLocations")
    .annotate(OpenApi.Summary, "Reorder locations"),
  HttpApiEndpoint.patch(
    "EventsAssignmentControllerAssignMapToLocation",
    "/guilds/:guildId/events/:eventId/heroes/:heroId/maps/:mapId/location",
    {
      params: EventHeroMapPath,
      payload: AssignEventMapLocationRequest,
      success: HttpApiSchema.Empty(200),
      error: HttpErrorResponse.pipe(HttpApiSchema.status(404)),
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(
      OpenApi.Identifier,
      "EventsAssignmentController_assignMapToLocation",
    )
    .annotate(OpenApi.Summary, "Assign map to location")
    .annotate(
      OpenApi.Description,
      "A null location removes the map from its location.",
    ),
  HttpApiEndpoint.get(
    "listPendingParticipationConfirmations",
    "/guilds/:guildId/events/:eventId/participation-confirmations/pending",
    {
      params: EventPath,
      success: PendingParticipationConfirmationsResponse,
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "listPendingParticipationConfirmations")
    .annotate(OpenApi.Summary, "Get participation confirmations")
    .annotate(
      OpenApi.Description,
      "Pending and expired confirmations of the authenticated member.",
    ),
  HttpApiEndpoint.post(
    "acknowledgeExpiredParticipationConfirmations",
    "/guilds/:guildId/events/:eventId/participation-confirmations/expired/acknowledge",
    {
      params: EventPath,
      payload: AcknowledgeExpiredParticipationConfirmationsRequest,
      success: AcknowledgeExpiredParticipationConfirmationsResponse.pipe(
        HttpApiSchema.status(201),
      ),
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(
      OpenApi.Identifier,
      "acknowledgeExpiredParticipationConfirmations",
    )
    .annotate(
      OpenApi.Summary,
      "Acknowledge expired participation confirmations",
    ),
  HttpApiEndpoint.post(
    "confirmParticipationForKill",
    "/guilds/:guildId/events/:eventId/kills/:killId/confirm-participation",
    {
      params: EventKillPath,
      success: ConfirmParticipationForKillResponse,
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "confirmParticipationForKill")
    .annotate(OpenApi.Summary, "Confirm participation in kill tracking")
    .annotate(
      OpenApi.Description,
      "Only within the configured confirmation window.",
    ),
  HttpApiEndpoint.get(
    "listEventRanking",
    "/guilds/:guildId/events/:eventId/ranking",
    {
      params: EventPath,
      success: EventRankingResponse,
      error: HttpErrorResponse.pipe(HttpApiSchema.status(404)),
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "listEventRanking")
    .annotate(OpenApi.Summary, "Get event ranking"),
  HttpApiEndpoint.patch(
    "updateRankingPoints",
    "/guilds/:guildId/events/:eventId/ranking/:rankingId",
    {
      params: EventRankingPath,
      payload: UpdateRankingPointsRequest,
      success: HttpApiSchema.Empty(200),
      error: HttpErrorResponse.pipe(HttpApiSchema.status(404)),
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "updateRankingPoints")
    .annotate(OpenApi.Summary, "Update ranking points")
    .annotate(
      OpenApi.Description,
      "Apply a signed manual points delta to a ranking entry (OWNER/ADMIN only)",
    ),
  HttpApiEndpoint.get(
    "listEventHeroTimers",
    "/guilds/:guildId/events/:eventId/timers",
    {
      params: EventPath,
      query: EventTimersQuery,
      success: EventTimersResponse,
      error: HttpErrorResponse.pipe(HttpApiSchema.status(404)),
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "listEventHeroTimers")
    .annotate(OpenApi.Summary, "Get event hero timers"),
  HttpApiEndpoint.get(
    "EventsRankingControllerGetEventHeroStats",
    "/guilds/:guildId/events/:eventId/hero-stats",
    {
      params: EventPath,
      success: EventHeroStatsListResponse,
      error: HttpErrorResponse.pipe(HttpApiSchema.status(404)),
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "EventsRankingController_getEventHeroStats")
    .annotate(OpenApi.Summary, "Get event hero stats"),
  HttpApiEndpoint.get(
    "listEventKillHistory",
    "/guilds/:guildId/events/:eventId/kill-history",
    {
      params: EventPath,
      query: KillHistoryQuery,
      success: Schema.toEncoded(KillHistoryResponse),
      error: [
        HttpErrorResponse.pipe(HttpApiSchema.status(400)),
        HttpErrorResponse.pipe(HttpApiSchema.status(404)),
      ],
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "listEventKillHistory")
    .annotate(OpenApi.Summary, "List event kill history summaries")
    .annotate(
      OpenApi.Description,
      "Read visible kills in descending (killedAt, id) order. Filter by hero or member. Cursors are opaque and scoped to the Organization, event and filters. Continuation reads current data, not a frozen snapshot. Full participants and map data are available from kill detail and timeline endpoints.",
    ),
  HttpApiEndpoint.get(
    "EventsRankingControllerGetKillDetail",
    "/guilds/:guildId/events/:eventId/heroes/:heroId/kills/:killId",
    {
      params: EventHeroKillPath,
      success: EventKillDetailResponse,
      error: HttpErrorResponse.pipe(HttpApiSchema.status(404)),
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "EventsRankingController_getKillDetail")
    .annotate(OpenApi.Summary, "Get kill details")
    .annotate(
      OpenApi.Description,
      "Includes participants, the scoring breakdown and matching loots.",
    ),
  HttpApiEndpoint.patch(
    "EventsRankingControllerUpdateKillPoint",
    "/guilds/:guildId/events/:eventId/kills/:killId/points/:killPointId",
    {
      params: EventKillPointPath,
      payload: UpdateKillPointRequest,
      success: HttpApiSchema.Empty(200),
      error: HttpErrorResponse.pipe(HttpApiSchema.status(404)),
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "EventsRankingController_updateKillPoint")
    .annotate(OpenApi.Summary, "Update kill point")
    .annotate(
      OpenApi.Description,
      "Apply a signed manual points delta for a specific kill participant (OWNER/ADMIN only). Automatically recalculates ranking.",
    ),
  HttpApiEndpoint.get(
    "EventsMonitoringControllerGetKillTimelineData",
    "/guilds/:guildId/events/:eventId/heroes/:heroId/kills/:killId/timeline",
    {
      params: EventHeroKillPath,
      success: EventKillTimelineResponse,
      error: HttpErrorResponse.pipe(HttpApiSchema.status(404)),
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(
      OpenApi.Identifier,
      "EventsMonitoringController_getKillTimelineData",
    )
    .annotate(OpenApi.Summary, "Get kill timeline data")
    .annotate(
      OpenApi.Description,
      "Includes map assignments and coverage gaps.",
    ),
  HttpApiEndpoint.get(
    "EventsMonitoringControllerGetHeroCoverageGaps",
    "/guilds/:guildId/events/:eventId/heroes/:heroId/coverage-gaps",
    {
      params: EventHeroPath,
      success: HeroCoverageGapsResponse,
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(
      OpenApi.Identifier,
      "EventsMonitoringController_getHeroCoverageGaps",
    )
    .annotate(OpenApi.Summary, "Get hero coverage gaps")
    .annotate(
      OpenApi.Description,
      "Periods when the hero's maps were unassigned or uncovered.",
    ),
  HttpApiEndpoint.get(
    "EventsMonitoringControllerGetMapCoverageGaps",
    "/guilds/:guildId/events/:eventId/maps/:mapId/coverage-gaps",
    {
      params: EventMapPath,
      success: CoverageGapsResponse,
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(
      OpenApi.Identifier,
      "EventsMonitoringController_getMapCoverageGaps",
    )
    .annotate(OpenApi.Summary, "Get map coverage gaps")
    .annotate(
      OpenApi.Description,
      "Periods when the map was unassigned or uncovered.",
    ),
  HttpApiEndpoint.get(
    "EventsMonitoringControllerGetActiveGapForMap",
    "/guilds/:guildId/events/:eventId/maps/:mapId/active-gap",
    {
      params: EventMapPath,
      success: ActiveCoverageGapResponse,
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(
      OpenApi.Identifier,
      "EventsMonitoringController_getActiveGapForMap",
    )
    .annotate(OpenApi.Summary, "Get active coverage gap for map")
    .annotate(OpenApi.Description, "Null when the map has no ongoing gap."),
  HttpApiEndpoint.get(
    "EventsMonitoringControllerGetActiveGapsForHero",
    "/guilds/:guildId/events/:eventId/heroes/:heroId/active-gaps",
    {
      params: EventHeroPath,
      success: CoverageGapsResponse,
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(
      OpenApi.Identifier,
      "EventsMonitoringController_getActiveGapsForHero",
    )
    .annotate(OpenApi.Summary, "Get all active coverage gaps for hero"),
  HttpApiEndpoint.get(
    "EventsMonitoringControllerGetHeroPresenceStats",
    "/guilds/:guildId/events/:eventId/heroes/:heroId/presence-stats",
    {
      params: EventHeroPath,
      success: HeroPresenceStatsResponse,
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(
      OpenApi.Identifier,
      "EventsMonitoringController_getHeroPresenceStats",
    )
    .annotate(OpenApi.Summary, "Get presence statistics for hero")
    .annotate(
      OpenApi.Description,
      "Aggregated over the members assigned to the hero's maps.",
    ),
  HttpApiEndpoint.get(
    "EventsMonitoringControllerGetHeroRespawnConfig",
    "/guilds/:guildId/events/:eventId/heroes/:heroId/respawn-config",
    {
      params: EventHeroPath,
      success: HeroRespawnConfigResponse,
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(
      OpenApi.Identifier,
      "EventsMonitoringController_getHeroRespawnConfig",
    )
    .annotate(OpenApi.Summary, "Get hero respawn configuration")
    .annotate(
      OpenApi.Description,
      "Includes the current respawn window and the default respawn times.",
    ),
  HttpApiEndpoint.post(
    "EventsMonitoringControllerCloseRespawnWindow",
    "/guilds/:guildId/events/:eventId/heroes/:heroId/close-respawn-window",
    {
      params: EventHeroPath,
      payload: CloseRespawnWindowRequest,
      success: HttpApiSchema.Empty(200),
      error: [
        HttpErrorResponse.pipe(HttpApiSchema.status(400)),
        HttpErrorResponse.pipe(HttpApiSchema.status(404)),
        HttpErrorResponse.pipe(HttpApiSchema.status(409)),
      ],
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(
      OpenApi.Identifier,
      "EventsMonitoringController_closeRespawnWindow",
    )
    .annotate(OpenApi.Summary, "Close hero respawn window")
    .annotate(
      OpenApi.Description,
      "Optionally opens a new window with the given or default times.",
    ),
  HttpApiEndpoint.post(
    "EventsMonitoringControllerOpenRespawnWindow",
    "/guilds/:guildId/events/:eventId/heroes/:heroId/open-respawn-window",
    {
      params: EventHeroPath,
      payload: OpenRespawnWindowRequest,
      success: HttpApiSchema.Empty(200),
      error: [
        HttpErrorResponse.pipe(HttpApiSchema.status(400)),
        HttpErrorResponse.pipe(HttpApiSchema.status(404)),
        HttpErrorResponse.pipe(HttpApiSchema.status(409)),
      ],
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(
      OpenApi.Identifier,
      "EventsMonitoringController_openRespawnWindow",
    )
    .annotate(OpenApi.Summary, "Open hero respawn window")
    .annotate(OpenApi.Description, "Uses the given or default times."),
  HttpApiEndpoint.get("listPinnedEvents", "/guilds/:guildId/pinned-events", {
    params: EventOrganizationPath,
    success: PinnedEventsResponse,
  })
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "listPinnedEvents")
    .annotate(OpenApi.Summary, "List active pinned events"),
  HttpApiEndpoint.put("pinEvent", "/guilds/:guildId/events/:eventId/pin", {
    params: EventPath,
    success: PinnedEventResponse,
    error: [
      HttpErrorResponse.pipe(HttpApiSchema.status(404)),
      HttpErrorResponse.pipe(HttpApiSchema.status(409)),
    ],
  })
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "pinEvent")
    .annotate(OpenApi.Summary, "Pin an active event"),
  HttpApiEndpoint.delete("unpinEvent", "/guilds/:guildId/events/:eventId/pin", {
    params: EventPath,
    success: HttpApiSchema.Empty(204),
  })
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "unpinEvent")
    .annotate(OpenApi.Summary, "Unpin an event"),
) {}
