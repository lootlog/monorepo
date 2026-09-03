/** Endpoints owned by the guilds HTTP module. */
import {
  HttpApiEndpoint,
  HttpApiGroup,
  HttpApiSchema,
  OpenApi,
} from "effect/unstable/httpapi";
import {
  ActivitiesControllerDeleteActivity200,
  ActivitiesControllerDeleteActivityPathParams,
  ActivitiesControllerFindByGuild200,
  ActivitiesControllerFindByGuildPathParams,
  ActivitiesControllerFindByGuildQuery,
  ActivitiesControllerFindByUser200,
  ActivitiesControllerFindByUserPathParams,
  ActivitiesControllerFindByUserQuery,
  ActivitiesControllerFindOne200,
  ActivitiesControllerFindOnePathParams,
  ActivitiesControllerGetMemberActivityStats200,
  ActivitiesControllerGetMemberActivityStatsPathParams,
  ActivitiesControllerSuggestActorNames200,
  ActivitiesControllerSuggestActorNamesPathParams,
  ActivitiesControllerSuggestActorNamesQuery,
  ActivitiesControllerSuggestClanNames200,
  ActivitiesControllerSuggestClanNamesPathParams,
  ActivitiesControllerSuggestClanNamesQuery,
  ActivitiesControllerSuggestWorlds200,
  ActivitiesControllerSuggestWorldsPathParams,
  ActivitiesControllerSuggestWorldsQuery,
} from "./schemas.js";
import { BearerSecurityMiddleware } from "../shared.js";

export class GuildsGroup extends HttpApiGroup.make("guilds").add(
  HttpApiEndpoint.get(
    "ActivitiesControllerFindByGuild",
    "/guilds/:guildId/activity-logs",
    {
      params: ActivitiesControllerFindByGuildPathParams,
      query: ActivitiesControllerFindByGuildQuery,
      success: ActivitiesControllerFindByGuild200,
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "ActivitiesController_findByGuild")
    .annotate(OpenApi.Summary, "Get activities for a specific guild"),
  HttpApiEndpoint.get(
    "ActivitiesControllerSuggestActorNames",
    "/guilds/:guildId/activity-logs/actor-name-suggestions",
    {
      params: ActivitiesControllerSuggestActorNamesPathParams,
      query: ActivitiesControllerSuggestActorNamesQuery,
      success: ActivitiesControllerSuggestActorNames200,
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "ActivitiesController_suggestActorNames")
    .annotate(OpenApi.Summary, "Get actor name suggestions for a guild"),
  HttpApiEndpoint.get(
    "ActivitiesControllerSuggestWorlds",
    "/guilds/:guildId/activity-logs/world-suggestions",
    {
      params: ActivitiesControllerSuggestWorldsPathParams,
      query: ActivitiesControllerSuggestWorldsQuery,
      success: ActivitiesControllerSuggestWorlds200,
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "ActivitiesController_suggestWorlds")
    .annotate(OpenApi.Summary, "Get world suggestions for a guild"),
  HttpApiEndpoint.get(
    "ActivitiesControllerSuggestClanNames",
    "/guilds/:guildId/activity-logs/clan-name-suggestions",
    {
      params: ActivitiesControllerSuggestClanNamesPathParams,
      query: ActivitiesControllerSuggestClanNamesQuery,
      success: ActivitiesControllerSuggestClanNames200,
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "ActivitiesController_suggestClanNames")
    .annotate(OpenApi.Summary, "Get clan name suggestions for a guild"),
  HttpApiEndpoint.get(
    "ActivitiesControllerFindByUser",
    "/guilds/:guildId/users/:userId/activity-logs",
    {
      params: ActivitiesControllerFindByUserPathParams,
      query: ActivitiesControllerFindByUserQuery,
      success: ActivitiesControllerFindByUser200,
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "ActivitiesController_findByUser")
    .annotate(OpenApi.Summary, "Get activities for a specific user in a guild"),
  HttpApiEndpoint.get(
    "ActivitiesControllerGetMemberActivityStats",
    "/guilds/:guildId/member-activity-stats",
    {
      params: ActivitiesControllerGetMemberActivityStatsPathParams,
      success: ActivitiesControllerGetMemberActivityStats200,
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "ActivitiesController_getMemberActivityStats")
    .annotate(
      OpenApi.Summary,
      "Get activity stats for guild members by source",
    ),
  HttpApiEndpoint.get(
    "ActivitiesControllerFindOne",
    "/guilds/:guildId/activity-logs/:id",
    {
      params: ActivitiesControllerFindOnePathParams,
      success: ActivitiesControllerFindOne200,
      error: HttpApiSchema.Empty(404),
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "ActivitiesController_findOne")
    .annotate(OpenApi.Summary, "Get a single activity by ID"),
  HttpApiEndpoint.delete(
    "ActivitiesControllerDeleteActivity",
    "/guilds/:guildId/activity-logs/:id",
    {
      params: ActivitiesControllerDeleteActivityPathParams,
      success: ActivitiesControllerDeleteActivity200,
      error: HttpApiSchema.Empty(404),
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "ActivitiesController_deleteActivity")
    .annotate(OpenApi.Summary, "Delete a specific activity by ID"),
) {}
