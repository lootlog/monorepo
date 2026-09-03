import { Effect } from "effect";
import * as HttpServerResponse from "effect/unstable/http/HttpServerResponse";
import { HttpApiBuilder } from "effect/unstable/httpapi";
import { LootlogApi } from "../../lootlog-api.js";
import {
  getGlobalTimerSettings,
  getGuildTimerSettings,
  migrateTimerSettings,
  toSettingsHttpResponse,
  updateGlobalTimerSettings,
  updateGuildTimerSettings,
} from "../settings/settings.operations.js";

export const TimerSettingsHandlers = HttpApiBuilder.group(
  LootlogApi,
  "timer-settings",
  (handlers) =>
    handlers
      .handle("TimerSettingsControllerGetGlobalSettings", () =>
        toSettingsHttpResponse(getGlobalTimerSettings()),
      )
      .handle("TimerSettingsControllerUpdateGlobalSettings", ({ payload }) =>
        toSettingsHttpResponse(updateGlobalTimerSettings(payload)),
      )
      .handle("TimerSettingsControllerGetGuildSettings", ({ params }) =>
        toSettingsHttpResponse(getGuildTimerSettings(params.guildId)),
      )
      .handle(
        "TimerSettingsControllerUpdateGuildSettings",
        ({ params, payload }) =>
          toSettingsHttpResponse(
            updateGuildTimerSettings(params.guildId, payload),
          ),
      )
      .handle("TimerSettingsControllerMigrateSettings", ({ payload }) =>
        toSettingsHttpResponse(
          Effect.map(migrateTimerSettings(payload), (result) =>
            HttpServerResponse.jsonUnsafe(result),
          ),
        ),
      ),
);
