/** Endpoints owned by the events HTTP module. */
import {
  HttpApiEndpoint,
  HttpApiGroup,
  HttpApiSchema,
  OpenApi,
} from "effect/unstable/httpapi";
import { BearerSecurityMiddleware } from "../shared.js";
import {
  AcknowledgeExpiredParticipationConfirmations201,
  AcknowledgeExpiredParticipationConfirmationsPathParams,
  AcknowledgeExpiredParticipationConfirmationsRequestJson,
  ConfirmParticipationForKill200,
  ConfirmParticipationForKillPathParams,
  CreateEvent201,
  CreateEventPathParams,
  CreateEventRequestJson,
  DeleteEvent200,
  DeleteEventPathParams,
  EventsAssignmentControllerAddHeroPathParams,
  EventsAssignmentControllerAddHeroRequestJson,
  EventsAssignmentControllerAddMap201,
  EventsAssignmentControllerAddMapPathParams,
  EventsAssignmentControllerAddMapRequestJson,
  EventsAssignmentControllerAssignMapToLocationPathParams,
  EventsAssignmentControllerAssignMapToLocationRequestJson,
  EventsAssignmentControllerAssignMemberPathParams,
  EventsAssignmentControllerAssignMemberRequestJson,
  EventsAssignmentControllerCreateLocationPathParams,
  EventsAssignmentControllerCreateLocationRequestJson,
  EventsAssignmentControllerDeleteHeroPathParams,
  EventsAssignmentControllerDeleteLocationPathParams,
  EventsAssignmentControllerDeleteMapPathParams,
  EventsAssignmentControllerGetLocationsPathParams,
  EventsAssignmentControllerReorderLocationsPathParams,
  EventsAssignmentControllerReorderLocationsRequestJson,
  EventsAssignmentControllerSelfAssignMemberPathParams,
  EventsAssignmentControllerSelfUnassignMemberPathParams,
  EventsAssignmentControllerUnassignMemberPathParams,
  EventsAssignmentControllerUnassignMemberQuery,
  EventsAssignmentControllerUpdateHeroPathParams,
  EventsAssignmentControllerUpdateHeroRequestJson,
  EventsAssignmentControllerUpdateLocationPathParams,
  EventsAssignmentControllerUpdateLocationRequestJson,
  EventsMonitoringControllerCloseRespawnWindowPathParams,
  EventsMonitoringControllerCloseRespawnWindowRequestJson,
  EventsMonitoringControllerGetActiveGapForMap200,
  EventsMonitoringControllerGetActiveGapForMapPathParams,
  EventsMonitoringControllerGetActiveGapsForHero200,
  EventsMonitoringControllerGetActiveGapsForHeroPathParams,
  EventsMonitoringControllerGetCoordination200,
  EventsMonitoringControllerGetCoordinationPathParams,
  EventsMonitoringControllerGetHeroCoverageGaps200,
  EventsMonitoringControllerGetHeroCoverageGapsPathParams,
  EventsMonitoringControllerGetHeroPresenceStats200,
  EventsMonitoringControllerGetHeroPresenceStatsPathParams,
  EventsMonitoringControllerGetHeroRespawnConfig200,
  EventsMonitoringControllerGetHeroRespawnConfigPathParams,
  EventsMonitoringControllerGetKillTimelineData200,
  EventsMonitoringControllerGetKillTimelineDataPathParams,
  EventsMonitoringControllerGetMapCoverageGaps200,
  EventsMonitoringControllerGetMapCoverageGapsPathParams,
  EventsMonitoringControllerOpenRespawnWindowPathParams,
  EventsMonitoringControllerOpenRespawnWindowRequestJson,
  EventsRankingControllerGetEventHeroStats200,
  EventsRankingControllerGetEventHeroStatsPathParams,
  EventsRankingControllerGetEventKillHistory200,
  EventsRankingControllerGetEventKillHistoryPathParams,
  EventsRankingControllerGetEventKillHistoryQuery,
  EventsRankingControllerGetHeroKillHistory200,
  EventsRankingControllerGetHeroKillHistoryPathParams,
  EventsRankingControllerGetHeroKillHistoryQuery,
  EventsRankingControllerGetKillDetail200,
  EventsRankingControllerGetKillDetailPathParams,
  EventsRankingControllerGetMemberKillHistory200,
  EventsRankingControllerGetMemberKillHistoryPathParams,
  EventsRankingControllerGetMemberKillHistoryQuery,
  EventsRankingControllerUpdateKillPointPathParams,
  EventsRankingControllerUpdateKillPointRequestJson,
  ListEventHeroTimers200,
  ListEventHeroTimersPathParams,
  ListEventHeroTimersQuery,
  ListEventMaps200,
  ListEventMapsPathParams,
  ListEventRanking200,
  ListEventRankingPathParams,
  ListEvents200,
  ListEventsPathParams,
  ListEventsQuery,
  ListPendingParticipationConfirmations200,
  ListPendingParticipationConfirmationsPathParams,
  ListPinnedEvents200,
  ListPinnedEventsPathParams,
  PinEvent200,
  PinEventPathParams,
  RecalculateEventPoints200,
  RecalculateEventPointsPathParams,
  ShowEvent200,
  ShowEventOverview200,
  ShowEventOverviewPathParams,
  ShowEventPathParams,
  ShowEventWrapped200,
  ShowEventWrappedPathParams,
  UnpinEventPathParams,
  UpdateEvent200,
  UpdateEventPathParams,
  UpdateEventRequestJson,
  UpdateRankingPointsPathParams,
  UpdateRankingPointsRequestJson,
} from "./schemas.js";

export class EventsGroup extends HttpApiGroup.make("events").add(
  HttpApiEndpoint.get("listEvents", "/guilds/:guildId/events", {
    params: ListEventsPathParams,
    query: ListEventsQuery,
    success: ListEvents200,
  })
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "listEvents")
    .annotate(OpenApi.Summary, "List guild events")
    .annotate(OpenApi.Description, "Get all events for a guild"),
  HttpApiEndpoint.post("createEvent", "/guilds/:guildId/events", {
    params: CreateEventPathParams,
    payload: CreateEventRequestJson,
    success: CreateEvent201.pipe(HttpApiSchema.status(201)),
    error: HttpApiSchema.Empty(403),
  })
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "createEvent")
    .annotate(OpenApi.Summary, "Create event")
    .annotate(
      OpenApi.Description,
      "Create a new guild event with maps and hero NPCs",
    ),
  HttpApiEndpoint.get("showEvent", "/guilds/:guildId/events/:eventId", {
    params: ShowEventPathParams,
    success: ShowEvent200,
    error: HttpApiSchema.Empty(404),
  })
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "showEvent")
    .annotate(OpenApi.Summary, "Get event details")
    .annotate(
      OpenApi.Description,
      "Get detailed information about a specific event",
    ),
  HttpApiEndpoint.delete("deleteEvent", "/guilds/:guildId/events/:eventId", {
    params: DeleteEventPathParams,
    success: DeleteEvent200,
    error: HttpApiSchema.Empty(404),
  })
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "deleteEvent")
    .annotate(OpenApi.Summary, "Delete event")
    .annotate(OpenApi.Description, "Delete an event"),
  HttpApiEndpoint.patch("updateEvent", "/guilds/:guildId/events/:eventId", {
    params: UpdateEventPathParams,
    payload: UpdateEventRequestJson,
    success: UpdateEvent200,
    error: HttpApiSchema.Empty(404),
  })
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "updateEvent")
    .annotate(OpenApi.Summary, "Update event")
    .annotate(OpenApi.Description, "Update an existing event"),
  HttpApiEndpoint.get(
    "showEventOverview",
    "/guilds/:guildId/events/:eventId/overview",
    {
      params: ShowEventOverviewPathParams,
      success: ShowEventOverview200,
      error: HttpApiSchema.Empty(404),
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "showEventOverview")
    .annotate(OpenApi.Summary, "Get event overview")
    .annotate(
      OpenApi.Description,
      "Get lightweight event overview for read-only views (without maps and rankings)",
    ),
  HttpApiEndpoint.get(
    "showEventWrapped",
    "/guilds/:guildId/events/:eventId/wrapped",
    {
      params: ShowEventWrappedPathParams,
      success: ShowEventWrapped200,
      error: HttpApiSchema.Empty(404),
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
      params: ListEventMapsPathParams,
      success: ListEventMaps200,
      error: HttpApiSchema.Empty(404),
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "listEventMaps")
    .annotate(OpenApi.Summary, "Get event maps")
    .annotate(
      OpenApi.Description,
      "Get map assignments grouped by hero for a specific event (read model for realtime map updates)",
    ),
  HttpApiEndpoint.post(
    "recalculateEventPoints",
    "/guilds/:guildId/events/:eventId/recalculate-points",
    {
      params: RecalculateEventPointsPathParams,
      success: RecalculateEventPoints200,
      error: HttpApiSchema.Empty(404),
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "recalculateEventPoints")
    .annotate(OpenApi.Summary, "Recalculate event points")
    .annotate(
      OpenApi.Description,
      "Manually recalculate all event kill points with current rules",
    ),
  HttpApiEndpoint.post(
    "EventsAssignmentControllerAssignMember",
    "/guilds/:guildId/events/:eventId/maps/:mapId/assign",
    {
      params: EventsAssignmentControllerAssignMemberPathParams,
      payload: EventsAssignmentControllerAssignMemberRequestJson,
      success: HttpApiSchema.Empty(200),
      error: HttpApiSchema.Empty(404),
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "EventsAssignmentController_assignMember")
    .annotate(OpenApi.Summary, "Assign member to map")
    .annotate(
      OpenApi.Description,
      "Assign a guild member to monitor a specific map",
    ),
  HttpApiEndpoint.delete(
    "EventsAssignmentControllerUnassignMember",
    "/guilds/:guildId/events/:eventId/maps/:mapId/assign",
    {
      params: EventsAssignmentControllerUnassignMemberPathParams,
      query: EventsAssignmentControllerUnassignMemberQuery,
      success: HttpApiSchema.Empty(200),
      error: HttpApiSchema.Empty(404),
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "EventsAssignmentController_unassignMember")
    .annotate(OpenApi.Summary, "Unassign member from map")
    .annotate(
      OpenApi.Description,
      "Remove an assigned member from a map. If memberId is provided, removes specific member; otherwise removes all.",
    ),
  HttpApiEndpoint.post(
    "EventsAssignmentControllerSelfAssignMember",
    "/guilds/:guildId/events/:eventId/maps/:mapId/self-assign",
    {
      params: EventsAssignmentControllerSelfAssignMemberPathParams,
      success: HttpApiSchema.Empty(200),
      error: HttpApiSchema.Empty(404),
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "EventsAssignmentController_selfAssignMember")
    .annotate(OpenApi.Summary, "Self-assign to map")
    .annotate(OpenApi.Description, "Assign yourself to monitor a specific map"),
  HttpApiEndpoint.delete(
    "EventsAssignmentControllerSelfUnassignMember",
    "/guilds/:guildId/events/:eventId/maps/:mapId/self-assign",
    {
      params: EventsAssignmentControllerSelfUnassignMemberPathParams,
      success: HttpApiSchema.Empty(200),
      error: HttpApiSchema.Empty(404),
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(
      OpenApi.Identifier,
      "EventsAssignmentController_selfUnassignMember",
    )
    .annotate(OpenApi.Summary, "Self-unassign from map")
    .annotate(OpenApi.Description, "Remove yourself from a specific map"),
  HttpApiEndpoint.post(
    "EventsAssignmentControllerAddHero",
    "/guilds/:guildId/events/:eventId/heroes",
    {
      params: EventsAssignmentControllerAddHeroPathParams,
      payload: EventsAssignmentControllerAddHeroRequestJson,
      success: HttpApiSchema.Empty(201),
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "EventsAssignmentController_addHero")
    .annotate(OpenApi.Summary, "Add hero to event")
    .annotate(OpenApi.Description, "Add a new hero to an existing event"),
  HttpApiEndpoint.delete(
    "EventsAssignmentControllerDeleteHero",
    "/guilds/:guildId/events/:eventId/heroes/:heroId",
    {
      params: EventsAssignmentControllerDeleteHeroPathParams,
      success: HttpApiSchema.Empty(200),
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "EventsAssignmentController_deleteHero")
    .annotate(OpenApi.Summary, "Delete hero")
    .annotate(OpenApi.Description, "Remove a hero from the event"),
  HttpApiEndpoint.patch(
    "EventsAssignmentControllerUpdateHero",
    "/guilds/:guildId/events/:eventId/heroes/:heroId",
    {
      params: EventsAssignmentControllerUpdateHeroPathParams,
      payload: EventsAssignmentControllerUpdateHeroRequestJson,
      success: HttpApiSchema.Empty(200),
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "EventsAssignmentController_updateHero")
    .annotate(OpenApi.Summary, "Update hero")
    .annotate(OpenApi.Description, "Update an existing hero details"),
  HttpApiEndpoint.post(
    "EventsAssignmentControllerAddMap",
    "/guilds/:guildId/events/:eventId/heroes/:heroId/maps",
    {
      params: EventsAssignmentControllerAddMapPathParams,
      payload: EventsAssignmentControllerAddMapRequestJson,
      success: EventsAssignmentControllerAddMap201.pipe(
        HttpApiSchema.status(201),
      ),
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "EventsAssignmentController_addMap")
    .annotate(OpenApi.Summary, "Add map to hero")
    .annotate(OpenApi.Description, "Add a new map to an existing hero"),
  HttpApiEndpoint.delete(
    "EventsAssignmentControllerDeleteMap",
    "/guilds/:guildId/events/:eventId/heroes/:heroId/maps/:mapId",
    {
      params: EventsAssignmentControllerDeleteMapPathParams,
      success: HttpApiSchema.Empty(200),
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "EventsAssignmentController_deleteMap")
    .annotate(OpenApi.Summary, "Delete map")
    .annotate(OpenApi.Description, "Remove a map from a hero"),
  HttpApiEndpoint.get(
    "EventsAssignmentControllerGetLocations",
    "/guilds/:guildId/events/:eventId/heroes/:heroId/locations",
    {
      params: EventsAssignmentControllerGetLocationsPathParams,
      success: HttpApiSchema.Empty(200),
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "EventsAssignmentController_getLocations")
    .annotate(OpenApi.Summary, "Get hero locations")
    .annotate(
      OpenApi.Description,
      "Get all locations for a hero with their maps",
    ),
  HttpApiEndpoint.post(
    "EventsAssignmentControllerCreateLocation",
    "/guilds/:guildId/events/:eventId/heroes/:heroId/locations",
    {
      params: EventsAssignmentControllerCreateLocationPathParams,
      payload: EventsAssignmentControllerCreateLocationRequestJson,
      success: HttpApiSchema.Empty(201),
      error: HttpApiSchema.Empty(400),
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "EventsAssignmentController_createLocation")
    .annotate(OpenApi.Summary, "Create location")
    .annotate(OpenApi.Description, "Create a new location for grouping maps"),
  HttpApiEndpoint.delete(
    "EventsAssignmentControllerDeleteLocation",
    "/guilds/:guildId/events/:eventId/heroes/:heroId/locations/:locationId",
    {
      params: EventsAssignmentControllerDeleteLocationPathParams,
      success: HttpApiSchema.Empty(200),
      error: HttpApiSchema.Empty(404),
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "EventsAssignmentController_deleteLocation")
    .annotate(OpenApi.Summary, "Delete location")
    .annotate(
      OpenApi.Description,
      "Delete a location. Maps in this location will become ungrouped.",
    ),
  HttpApiEndpoint.patch(
    "EventsAssignmentControllerUpdateLocation",
    "/guilds/:guildId/events/:eventId/heroes/:heroId/locations/:locationId",
    {
      params: EventsAssignmentControllerUpdateLocationPathParams,
      payload: EventsAssignmentControllerUpdateLocationRequestJson,
      success: HttpApiSchema.Empty(200),
      error: HttpApiSchema.Empty(404),
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "EventsAssignmentController_updateLocation")
    .annotate(OpenApi.Summary, "Update location")
    .annotate(OpenApi.Description, "Update a location name"),
  HttpApiEndpoint.post(
    "EventsAssignmentControllerReorderLocations",
    "/guilds/:guildId/events/:eventId/heroes/:heroId/locations/reorder",
    {
      params: EventsAssignmentControllerReorderLocationsPathParams,
      payload: EventsAssignmentControllerReorderLocationsRequestJson,
      success: HttpApiSchema.Empty(200),
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "EventsAssignmentController_reorderLocations")
    .annotate(OpenApi.Summary, "Reorder locations")
    .annotate(OpenApi.Description, "Change the order of locations"),
  HttpApiEndpoint.patch(
    "EventsAssignmentControllerAssignMapToLocation",
    "/guilds/:guildId/events/:eventId/heroes/:heroId/maps/:mapId/location",
    {
      params: EventsAssignmentControllerAssignMapToLocationPathParams,
      payload: EventsAssignmentControllerAssignMapToLocationRequestJson,
      success: HttpApiSchema.Empty(200),
      error: HttpApiSchema.Empty(404),
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
      "Assign a map to a location or remove it from a location (set to null)",
    ),
  HttpApiEndpoint.get(
    "listPendingParticipationConfirmations",
    "/guilds/:guildId/events/:eventId/participation-confirmations/pending",
    {
      params: ListPendingParticipationConfirmationsPathParams,
      success: ListPendingParticipationConfirmations200,
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "listPendingParticipationConfirmations")
    .annotate(OpenApi.Summary, "Get participation confirmations")
    .annotate(
      OpenApi.Description,
      "Get pending and expired kill participation confirmations for currently authenticated member",
    ),
  HttpApiEndpoint.post(
    "acknowledgeExpiredParticipationConfirmations",
    "/guilds/:guildId/events/:eventId/participation-confirmations/expired/acknowledge",
    {
      params: AcknowledgeExpiredParticipationConfirmationsPathParams,
      payload: AcknowledgeExpiredParticipationConfirmationsRequestJson,
      success: AcknowledgeExpiredParticipationConfirmations201.pipe(
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
      params: ConfirmParticipationForKillPathParams,
      success: ConfirmParticipationForKill200,
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "confirmParticipationForKill")
    .annotate(OpenApi.Summary, "Confirm participation in kill tracking")
    .annotate(
      OpenApi.Description,
      "Confirm member participation for a kill within configured confirmation window",
    ),
  HttpApiEndpoint.get(
    "listEventRanking",
    "/guilds/:guildId/events/:eventId/ranking",
    {
      params: ListEventRankingPathParams,
      success: ListEventRanking200,
      error: HttpApiSchema.Empty(404),
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "listEventRanking")
    .annotate(OpenApi.Summary, "Get event ranking")
    .annotate(OpenApi.Description, "Get the ranking for an event"),
  HttpApiEndpoint.patch(
    "updateRankingPoints",
    "/guilds/:guildId/events/:eventId/ranking/:rankingId",
    {
      params: UpdateRankingPointsPathParams,
      payload: UpdateRankingPointsRequestJson,
      success: HttpApiSchema.Empty(200),
      error: HttpApiSchema.Empty(404),
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
      params: ListEventHeroTimersPathParams,
      query: ListEventHeroTimersQuery,
      success: ListEventHeroTimers200,
      error: HttpApiSchema.Empty(404),
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "listEventHeroTimers")
    .annotate(OpenApi.Summary, "Get event hero timers")
    .annotate(
      OpenApi.Description,
      "Get timers for all hero NPCs in this event",
    ),
  HttpApiEndpoint.get(
    "EventsRankingControllerGetEventHeroStats",
    "/guilds/:guildId/events/:eventId/hero-stats",
    {
      params: EventsRankingControllerGetEventHeroStatsPathParams,
      success: EventsRankingControllerGetEventHeroStats200,
      error: HttpApiSchema.Empty(404),
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "EventsRankingController_getEventHeroStats")
    .annotate(OpenApi.Summary, "Get event hero stats")
    .annotate(
      OpenApi.Description,
      "Get kill counts and stats for all heroes in an event",
    ),
  HttpApiEndpoint.get(
    "EventsRankingControllerGetEventKillHistory",
    "/guilds/:guildId/events/:eventId/kills",
    {
      params: EventsRankingControllerGetEventKillHistoryPathParams,
      query: EventsRankingControllerGetEventKillHistoryQuery,
      success: EventsRankingControllerGetEventKillHistory200,
      error: HttpApiSchema.Empty(404),
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "EventsRankingController_getEventKillHistory")
    .annotate(OpenApi.Summary, "Get event kill history")
    .annotate(
      OpenApi.Description,
      "Get paginated kill history for all heroes in an event, with participant point details",
    ),
  HttpApiEndpoint.get(
    "EventsRankingControllerGetMemberKillHistory",
    "/guilds/:guildId/events/:eventId/members/:memberId/kills",
    {
      params: EventsRankingControllerGetMemberKillHistoryPathParams,
      query: EventsRankingControllerGetMemberKillHistoryQuery,
      success: EventsRankingControllerGetMemberKillHistory200,
      error: HttpApiSchema.Empty(404),
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(
      OpenApi.Identifier,
      "EventsRankingController_getMemberKillHistory",
    )
    .annotate(OpenApi.Summary, "Get member kill history")
    .annotate(
      OpenApi.Description,
      "Get paginated kill history for a specific member in an event, with detailed point breakdown per kill",
    ),
  HttpApiEndpoint.get(
    "EventsRankingControllerGetHeroKillHistory",
    "/guilds/:guildId/events/:eventId/heroes/:heroId/kills",
    {
      params: EventsRankingControllerGetHeroKillHistoryPathParams,
      query: EventsRankingControllerGetHeroKillHistoryQuery,
      success: EventsRankingControllerGetHeroKillHistory200,
      error: HttpApiSchema.Empty(404),
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "EventsRankingController_getHeroKillHistory")
    .annotate(OpenApi.Summary, "Get hero kill history")
    .annotate(
      OpenApi.Description,
      "Get paginated kill history for a specific hero, with participant point details",
    ),
  HttpApiEndpoint.get(
    "EventsRankingControllerGetKillDetail",
    "/guilds/:guildId/events/:eventId/heroes/:heroId/kills/:killId",
    {
      params: EventsRankingControllerGetKillDetailPathParams,
      success: EventsRankingControllerGetKillDetail200,
      error: HttpApiSchema.Empty(404),
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "EventsRankingController_getKillDetail")
    .annotate(OpenApi.Summary, "Get kill details")
    .annotate(
      OpenApi.Description,
      "Get detailed information about a specific kill including participants, scoring breakdown, and matching loots",
    ),
  HttpApiEndpoint.patch(
    "EventsRankingControllerUpdateKillPoint",
    "/guilds/:guildId/events/:eventId/kills/:killId/points/:killPointId",
    {
      params: EventsRankingControllerUpdateKillPointPathParams,
      payload: EventsRankingControllerUpdateKillPointRequestJson,
      success: HttpApiSchema.Empty(200),
      error: HttpApiSchema.Empty(404),
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
    "EventsMonitoringControllerGetCoordination",
    "/guilds/:guildId/events/:eventId/coordination",
    {
      params: EventsMonitoringControllerGetCoordinationPathParams,
      success: EventsMonitoringControllerGetCoordination200,
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "EventsMonitoringController_getCoordination")
    .annotate(OpenApi.Summary, "Get event coordination overview")
    .annotate(
      OpenApi.Description,
      "Get respawn priorities, map coverage gaps, and recommended actions for an event",
    ),
  HttpApiEndpoint.get(
    "EventsMonitoringControllerGetKillTimelineData",
    "/guilds/:guildId/events/:eventId/heroes/:heroId/kills/:killId/timeline",
    {
      params: EventsMonitoringControllerGetKillTimelineDataPathParams,
      success: EventsMonitoringControllerGetKillTimelineData200,
      error: HttpApiSchema.Empty(404),
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
      "Get map timeline data with assignments and gaps for a specific kill",
    ),
  HttpApiEndpoint.get(
    "EventsMonitoringControllerGetHeroCoverageGaps",
    "/guilds/:guildId/events/:eventId/heroes/:heroId/coverage-gaps",
    {
      params: EventsMonitoringControllerGetHeroCoverageGapsPathParams,
      success: EventsMonitoringControllerGetHeroCoverageGaps200,
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
      "Get coverage gap history for a specific hero (periods when maps were unassigned or uncovered)",
    ),
  HttpApiEndpoint.get(
    "EventsMonitoringControllerGetMapCoverageGaps",
    "/guilds/:guildId/events/:eventId/maps/:mapId/coverage-gaps",
    {
      params: EventsMonitoringControllerGetMapCoverageGapsPathParams,
      success: EventsMonitoringControllerGetMapCoverageGaps200,
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
      "Get coverage gap history for a specific map (periods when the map was unassigned or uncovered)",
    ),
  HttpApiEndpoint.get(
    "EventsMonitoringControllerGetActiveGapForMap",
    "/guilds/:guildId/events/:eventId/maps/:mapId/active-gap",
    {
      params: EventsMonitoringControllerGetActiveGapForMapPathParams,
      success: EventsMonitoringControllerGetActiveGapForMap200,
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(
      OpenApi.Identifier,
      "EventsMonitoringController_getActiveGapForMap",
    )
    .annotate(OpenApi.Summary, "Get active coverage gap for map")
    .annotate(
      OpenApi.Description,
      "Get the currently active (ongoing) coverage gap for a map if any exists",
    ),
  HttpApiEndpoint.get(
    "EventsMonitoringControllerGetActiveGapsForHero",
    "/guilds/:guildId/events/:eventId/heroes/:heroId/active-gaps",
    {
      params: EventsMonitoringControllerGetActiveGapsForHeroPathParams,
      success: EventsMonitoringControllerGetActiveGapsForHero200,
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(
      OpenApi.Identifier,
      "EventsMonitoringController_getActiveGapsForHero",
    )
    .annotate(OpenApi.Summary, "Get all active coverage gaps for hero")
    .annotate(
      OpenApi.Description,
      "Get all currently active (ongoing) coverage gaps for all maps of a hero",
    ),
  HttpApiEndpoint.get(
    "EventsMonitoringControllerGetHeroPresenceStats",
    "/guilds/:guildId/events/:eventId/heroes/:heroId/presence-stats",
    {
      params: EventsMonitoringControllerGetHeroPresenceStatsPathParams,
      success: EventsMonitoringControllerGetHeroPresenceStats200,
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
      "Get aggregated presence statistics for all members assigned to hero maps",
    ),
  HttpApiEndpoint.get(
    "EventsMonitoringControllerGetHeroRespawnConfig",
    "/guilds/:guildId/events/:eventId/heroes/:heroId/respawn-config",
    {
      params: EventsMonitoringControllerGetHeroRespawnConfigPathParams,
      success: EventsMonitoringControllerGetHeroRespawnConfig200,
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
      "Get current respawn window status and default respawn times for a hero",
    ),
  HttpApiEndpoint.post(
    "EventsMonitoringControllerCloseRespawnWindow",
    "/guilds/:guildId/events/:eventId/heroes/:heroId/close-respawn-window",
    {
      params: EventsMonitoringControllerCloseRespawnWindowPathParams,
      payload: EventsMonitoringControllerCloseRespawnWindowRequestJson,
      success: HttpApiSchema.Empty(200),
      error: [HttpApiSchema.Empty(400), HttpApiSchema.Empty(404)],
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
      "Manually close a respawn window for a hero. Optionally creates a new window with specified or default times.",
    ),
  HttpApiEndpoint.post(
    "EventsMonitoringControllerOpenRespawnWindow",
    "/guilds/:guildId/events/:eventId/heroes/:heroId/open-respawn-window",
    {
      params: EventsMonitoringControllerOpenRespawnWindowPathParams,
      payload: EventsMonitoringControllerOpenRespawnWindowRequestJson,
      success: HttpApiSchema.Empty(200),
      error: [HttpApiSchema.Empty(400), HttpApiSchema.Empty(404)],
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(
      OpenApi.Identifier,
      "EventsMonitoringController_openRespawnWindow",
    )
    .annotate(OpenApi.Summary, "Open hero respawn window")
    .annotate(
      OpenApi.Description,
      "Manually open a new respawn window for a hero with specified or default times.",
    ),
  HttpApiEndpoint.get("listPinnedEvents", "/guilds/:guildId/pinned-events", {
    params: ListPinnedEventsPathParams,
    success: ListPinnedEvents200,
  })
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "listPinnedEvents")
    .annotate(OpenApi.Summary, "List active pinned events"),
  HttpApiEndpoint.put("pinEvent", "/guilds/:guildId/events/:eventId/pin", {
    params: PinEventPathParams,
    success: PinEvent200,
    error: [HttpApiSchema.Empty(404), HttpApiSchema.Empty(409)],
  })
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "pinEvent")
    .annotate(OpenApi.Summary, "Pin an active event"),
  HttpApiEndpoint.delete("unpinEvent", "/guilds/:guildId/events/:eventId/pin", {
    params: UnpinEventPathParams,
    success: HttpApiSchema.Empty(204),
  })
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "unpinEvent")
    .annotate(OpenApi.Summary, "Unpin an event"),
) {}
