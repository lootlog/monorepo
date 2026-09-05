/** Endpoints owned by the timers HTTP module. */
import {
  HttpApiEndpoint,
  HttpApiGroup,
  HttpApiSchema,
  OpenApi,
} from "effect/unstable/httpapi";
import { BearerSecurityMiddleware, HttpErrorResponse } from "../shared.js";
import {
  CreateAutoTimerResponse,
  CreateAutoTimerRequest,
  TimerResponse,
  TimerOrganizationPath,
  CreateManualTimerRequest,
  TimerPath,
  TimersQuery,
  TimersResponse,
  TimerHistoryListResponse,
  RecentTimerHistoryQuery,
  TimerHistoryQuery,
  TimerListOrganizationPath,
  ResetTimerRequest,
  TimerHistoryEntryPath,
  TimerNpcSearchResponse,
  TimerNpcSearchQuery,
} from "#src/contracts/timers/schemas";

export class TimersGroup extends HttpApiGroup.make("timers").add(
  HttpApiEndpoint.get("TimersControllerGetAllTimers", "/timers", {
    query: TimersQuery,
    success: TimersResponse,
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
      query: RecentTimerHistoryQuery,
      success: TimerHistoryListResponse,
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
    params: TimerListOrganizationPath,
    query: TimersQuery,
    success: TimersResponse,
    error: HttpErrorResponse.pipe(HttpApiSchema.status(403)),
  })
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "TimersController_getTimers")
    .annotate(OpenApi.Summary, "Get guild timers")
    .annotate(OpenApi.Description, "Retrieve timers for a specific guild"),
  HttpApiEndpoint.get(
    "TimersControllerSearchNpcsWithTimerData",
    "/guilds/:guildId/timers/npcs/search",
    {
      params: TimerOrganizationPath,
      query: TimerNpcSearchQuery,
      success: TimerNpcSearchResponse,
      error: HttpErrorResponse.pipe(HttpApiSchema.status(403)),
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
    payload: CreateAutoTimerRequest,
    success: CreateAutoTimerResponse.pipe(HttpApiSchema.status(201)),
    error: [
      HttpErrorResponse.pipe(HttpApiSchema.status(400)),
      HttpErrorResponse.pipe(HttpApiSchema.status(403)),
      HttpErrorResponse.pipe(HttpApiSchema.status(409)),
    ],
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
      params: TimerPath,
      payload: ResetTimerRequest,
      success: TimerResponse,
      error: [
        HttpErrorResponse.pipe(HttpApiSchema.status(403)),
        HttpErrorResponse.pipe(HttpApiSchema.status(404)),
        HttpErrorResponse.pipe(HttpApiSchema.status(400)),
      ],
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
      params: TimerPath,
      query: TimersQuery,
      success: HttpApiSchema.Empty(200),
      error: [
        HttpErrorResponse.pipe(HttpApiSchema.status(403)),
        HttpErrorResponse.pipe(HttpApiSchema.status(404)),
        HttpErrorResponse.pipe(HttpApiSchema.status(400)),
      ],
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
      params: TimerPath,
      query: TimerHistoryQuery,
      success: TimerHistoryListResponse,
      error: [
        HttpErrorResponse.pipe(HttpApiSchema.status(400)),
        HttpErrorResponse.pipe(HttpApiSchema.status(403)),
        HttpErrorResponse.pipe(HttpApiSchema.status(404)),
      ],
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
      params: TimerHistoryEntryPath,
      success: TimerResponse.pipe(HttpApiSchema.status(201)),
      error: [
        HttpErrorResponse.pipe(HttpApiSchema.status(400)),
        HttpErrorResponse.pipe(HttpApiSchema.status(403)),
        HttpErrorResponse.pipe(HttpApiSchema.status(404)),
        HttpErrorResponse.pipe(HttpApiSchema.status(409)),
      ],
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
      params: TimerOrganizationPath,
      payload: CreateManualTimerRequest,
      success: TimerResponse.pipe(HttpApiSchema.status(201)),
      error: [
        HttpErrorResponse.pipe(HttpApiSchema.status(403)),
        HttpErrorResponse.pipe(HttpApiSchema.status(400)),
        HttpErrorResponse.pipe(HttpApiSchema.status(404)),
      ],
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "TimersController_createManualTimer")
    .annotate(OpenApi.Summary, "Create manual timer")
    .annotate(OpenApi.Description, "Manually create a timer for a guild"),
) {}
