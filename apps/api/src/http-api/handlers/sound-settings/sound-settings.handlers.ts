import { HttpApiBuilder } from "effect/unstable/httpapi";
import { LootlogApi } from "../../lootlog-api.js";
import {
  getSoundSettings,
  toSettingsHttpResponse,
  updateSoundSettings,
} from "../settings/settings.operations.js";

export const SoundSettingsHandlers = HttpApiBuilder.group(
  LootlogApi,
  "sound-settings",
  (handlers) =>
    handlers
      .handle("SoundSettingsControllerGetSettings", () =>
        toSettingsHttpResponse(getSoundSettings()),
      )
      .handle("SoundSettingsControllerUpdateSettings", ({ payload }) =>
        toSettingsHttpResponse(updateSoundSettings(payload)),
      ),
);
