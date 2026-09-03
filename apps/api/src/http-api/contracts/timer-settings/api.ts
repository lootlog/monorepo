/** Endpoints owned by the timer-settings HTTP module. */
import {
  HttpApiEndpoint,
  HttpApiGroup,
  HttpApiSchema,
  OpenApi,
} from "effect/unstable/httpapi";
import { BearerSecurityMiddleware } from "../shared.js";
import {
  TimerSettingsControllerGetGlobalSettings200,
  TimerSettingsControllerGetGuildSettings200,
  TimerSettingsControllerGetGuildSettingsPathParams,
  TimerSettingsControllerMigrateSettingsRequestJson,
  TimerSettingsControllerUpdateGlobalSettings200,
  TimerSettingsControllerUpdateGlobalSettingsRequestJson,
  TimerSettingsControllerUpdateGuildSettings200,
  TimerSettingsControllerUpdateGuildSettingsPathParams,
  TimerSettingsControllerUpdateGuildSettingsRequestJson,
} from "./schemas.js";

export class TimerSettingsGroup extends HttpApiGroup.make("timer-settings").add(
  HttpApiEndpoint.get(
    "TimerSettingsControllerGetGlobalSettings",
    "/timer-settings",
    { success: TimerSettingsControllerGetGlobalSettings200 },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "TimerSettingsController_getGlobalSettings")
    .annotate(OpenApi.Summary, "Get global timer settings")
    .annotate(OpenApi.Description, "Retrieve user global timer settings"),
  HttpApiEndpoint.patch(
    "TimerSettingsControllerUpdateGlobalSettings",
    "/timer-settings",
    {
      payload: TimerSettingsControllerUpdateGlobalSettingsRequestJson,
      success: TimerSettingsControllerUpdateGlobalSettings200,
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(
      OpenApi.Identifier,
      "TimerSettingsController_updateGlobalSettings",
    )
    .annotate(OpenApi.Summary, "Update global timer settings")
    .annotate(OpenApi.Description, "Update user global timer settings"),
  HttpApiEndpoint.get(
    "TimerSettingsControllerGetGuildSettings",
    "/timer-settings/guilds/:guildId",
    {
      params: TimerSettingsControllerGetGuildSettingsPathParams,
      success: TimerSettingsControllerGetGuildSettings200,
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "TimerSettingsController_getGuildSettings")
    .annotate(OpenApi.Summary, "Get guild-specific timer settings")
    .annotate(
      OpenApi.Description,
      "Retrieve user timer settings for a specific guild",
    ),
  HttpApiEndpoint.patch(
    "TimerSettingsControllerUpdateGuildSettings",
    "/timer-settings/guilds/:guildId",
    {
      params: TimerSettingsControllerUpdateGuildSettingsPathParams,
      payload: TimerSettingsControllerUpdateGuildSettingsRequestJson,
      success: TimerSettingsControllerUpdateGuildSettings200,
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "TimerSettingsController_updateGuildSettings")
    .annotate(OpenApi.Summary, "Update guild-specific timer settings")
    .annotate(
      OpenApi.Description,
      "Update user timer settings for a specific guild",
    ),
  HttpApiEndpoint.post(
    "TimerSettingsControllerMigrateSettings",
    "/timer-settings/migrate",
    {
      payload: TimerSettingsControllerMigrateSettingsRequestJson,
      success: HttpApiSchema.Empty(200),
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "TimerSettingsController_migrateSettings")
    .annotate(OpenApi.Summary, "Migrate localStorage settings to backend")
    .annotate(
      OpenApi.Description,
      "Migrate timer settings from localStorage to backend with conflict resolution",
    ),
) {}
