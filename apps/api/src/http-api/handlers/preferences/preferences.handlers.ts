import { HttpApiBuilder } from "effect/unstable/httpapi";
import { LootlogApi } from "../../lootlog-api.js";
import {
  getPreferences,
  patchPreferences,
  toSettingsHttpResponse,
} from "../settings/settings.operations.js";

export const PreferencesHandlers = HttpApiBuilder.group(
  LootlogApi,
  "preferences",
  (handlers) =>
    handlers
      .handle("SettingsDocumentsControllerGetPreferences", ({ query }) =>
        toSettingsHttpResponse(getPreferences(query)),
      )
      .handle("SettingsDocumentsControllerPatchPreferences", ({ payload }) =>
        toSettingsHttpResponse(patchPreferences(payload)),
      ),
);
