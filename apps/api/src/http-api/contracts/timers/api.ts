/** Endpoints owned by the timers HTTP module. */
import {
  HttpApiEndpoint,
  HttpApiGroup,
  HttpApiSchema,
  OpenApi,
} from "effect/unstable/httpapi";
import { BearerSecurityMiddleware } from "../shared.js";
import {
  TimersControllerCreateAutoTimer201,
  TimersControllerCreateAutoTimerRequestJson,
  TimersControllerCreateManualTimer201,
  TimersControllerCreateManualTimerPathParams,
  TimersControllerCreateManualTimerRequestJson,
  TimersControllerDeleteTimerPathParams,
  TimersControllerDeleteTimerQuery,
  TimersControllerGetAllTimers200,
  TimersControllerGetAllTimersQuery,
  TimersControllerGetRecentTimerHistory200,
  TimersControllerGetRecentTimerHistoryQuery,
  TimersControllerGetTimerHistory200,
  TimersControllerGetTimerHistoryPathParams,
  TimersControllerGetTimerHistoryQuery,
  TimersControllerGetTimers200,
  TimersControllerGetTimersPathParams,
  TimersControllerGetTimersQuery,
  TimersControllerResetTimer200,
  TimersControllerResetTimerPathParams,
  TimersControllerResetTimerRequestJson,
  TimersControllerRestoreTimerFromHistory201,
  TimersControllerRestoreTimerFromHistoryPathParams,
  TimersControllerSearchNpcsWithTimerData200,
  TimersControllerSearchNpcsWithTimerDataPathParams,
  TimersControllerSearchNpcsWithTimerDataQuery,
} from "./schemas.js";

export class TimersGroup extends HttpApiGroup.make("timers").add(
  HttpApiEndpoint.get("TimersControllerGetAllTimers", "/timers", {
    query: TimersControllerGetAllTimersQuery,
    success: TimersControllerGetAllTimers200,
  })
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "TimersController_getAllTimers")
    .annotate(OpenApi.Summary, "Get all user timers")
    .annotate(
      OpenApi.Description,
      "Retrieve all timers accessible to the authenticated user across all guilds",
    ),
  HttpApiEndpoint.get(
    "TimersControllerGetRecentTimerHistory",
    "/timers/history",
    {
      query: TimersControllerGetRecentTimerHistoryQuery,
      success: TimersControllerGetRecentTimerHistory200,
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "TimersController_getRecentTimerHistory")
    .annotate(OpenApi.Summary, "Get recent timer action history")
    .annotate(
      OpenApi.Description,
      "Retrieve latest visible timer history entries for an authenticated user guild",
    ),
  HttpApiEndpoint.get("TimersControllerGetTimers", "/guilds/:guildId/timers", {
    params: TimersControllerGetTimersPathParams,
    query: TimersControllerGetTimersQuery,
    success: TimersControllerGetTimers200,
    error: HttpApiSchema.Empty(403),
  })
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "TimersController_getTimers")
    .annotate(OpenApi.Summary, "Get guild timers")
    .annotate(OpenApi.Description, "Retrieve timers for a specific guild"),
  HttpApiEndpoint.get(
    "TimersControllerSearchNpcsWithTimerData",
    "/guilds/:guildId/timers/npcs/search",
    {
      params: TimersControllerSearchNpcsWithTimerDataPathParams,
      query: TimersControllerSearchNpcsWithTimerDataQuery,
      success: TimersControllerSearchNpcsWithTimerData200,
      error: HttpApiSchema.Empty(403),
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "TimersController_searchNpcsWithTimerData")
    .annotate(OpenApi.Summary, "Search NPCs with timer data")
    .annotate(
      OpenApi.Description,
      "Search for NPCs that have been timed in this guild/world, returning their latest respawn configuration",
    ),
  HttpApiEndpoint.post("TimersControllerCreateAutoTimer", "/timers/auto", {
    payload: TimersControllerCreateAutoTimerRequestJson,
    success: TimersControllerCreateAutoTimer201.pipe(HttpApiSchema.status(201)),
    error: [HttpApiSchema.Empty(400), HttpApiSchema.Empty(403)],
  })
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "TimersController_createAutoTimer")
    .annotate(OpenApi.Summary, "Create automatic timers")
    .annotate(
      OpenApi.Description,
      "Resolve target guilds from character catching settings and create timers for them",
    ),
  HttpApiEndpoint.patch(
    "TimersControllerResetTimer",
    "/guilds/:guildId/timers/:timerIdentifier/reset",
    {
      params: TimersControllerResetTimerPathParams,
      payload: TimersControllerResetTimerRequestJson,
      success: TimersControllerResetTimer200,
      error: [HttpApiSchema.Empty(403), HttpApiSchema.Empty(404)],
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "TimersController_resetTimer")
    .annotate(OpenApi.Summary, "Reset timer")
    .annotate(
      OpenApi.Description,
      "Reset a timer for a specific NPC in a guild",
    ),
  HttpApiEndpoint.delete(
    "TimersControllerDeleteTimer",
    "/guilds/:guildId/timers/:timerIdentifier",
    {
      params: TimersControllerDeleteTimerPathParams,
      query: TimersControllerDeleteTimerQuery,
      success: HttpApiSchema.Empty(200),
      error: [HttpApiSchema.Empty(403), HttpApiSchema.Empty(404)],
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "TimersController_deleteTimer")
    .annotate(OpenApi.Summary, "Delete timer")
    .annotate(
      OpenApi.Description,
      "Delete a timer for a specific NPC in a guild",
    ),
  HttpApiEndpoint.get(
    "TimersControllerGetTimerHistory",
    "/guilds/:guildId/timers/:timerIdentifier/history",
    {
      params: TimersControllerGetTimerHistoryPathParams,
      query: TimersControllerGetTimerHistoryQuery,
      success: TimersControllerGetTimerHistory200,
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "TimersController_getTimerHistory")
    .annotate(OpenApi.Summary, "Get timer action history")
    .annotate(
      OpenApi.Description,
      "Retrieve latest action history entries for a guild timer",
    ),
  HttpApiEndpoint.post(
    "TimersControllerRestoreTimerFromHistory",
    "/guilds/:guildId/timers/history/:historyEntryId/restore",
    {
      params: TimersControllerRestoreTimerFromHistoryPathParams,
      success: TimersControllerRestoreTimerFromHistory201.pipe(
        HttpApiSchema.status(201),
      ),
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "TimersController_restoreTimerFromHistory")
    .annotate(OpenApi.Summary, "Restore timer from history")
    .annotate(
      OpenApi.Description,
      "Restore a deleted timer from a timer history entry",
    ),
  HttpApiEndpoint.post(
    "TimersControllerCreateManualTimer",
    "/guilds/:guildId/timers/manual",
    {
      params: TimersControllerCreateManualTimerPathParams,
      payload: TimersControllerCreateManualTimerRequestJson,
      success: TimersControllerCreateManualTimer201.pipe(
        HttpApiSchema.status(201),
      ),
      error: HttpApiSchema.Empty(403),
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "TimersController_createManualTimer")
    .annotate(OpenApi.Summary, "Create manual timer")
    .annotate(OpenApi.Description, "Manually create a timer for a guild"),
) {}
