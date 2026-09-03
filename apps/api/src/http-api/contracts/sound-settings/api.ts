/** Endpoints owned by the sound-settings HTTP module. */
import {
  HttpApiEndpoint,
  HttpApiGroup,
  OpenApi,
} from "effect/unstable/httpapi";
import { BearerSecurityMiddleware } from "../shared.js";
import {
  SoundSettingsControllerGetSettings200,
  SoundSettingsControllerUpdateSettings200,
  SoundSettingsControllerUpdateSettingsRequestJson,
} from "./schemas.js";

export class SoundSettingsGroup extends HttpApiGroup.make("sound-settings").add(
  HttpApiEndpoint.get("SoundSettingsControllerGetSettings", "/sound-settings", {
    success: SoundSettingsControllerGetSettings200,
  })
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "SoundSettingsController_getSettings")
    .annotate(OpenApi.Summary, "Get sound settings")
    .annotate(OpenApi.Description, "Retrieve user sound settings"),
  HttpApiEndpoint.patch(
    "SoundSettingsControllerUpdateSettings",
    "/sound-settings",
    {
      payload: SoundSettingsControllerUpdateSettingsRequestJson,
      success: SoundSettingsControllerUpdateSettings200,
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "SoundSettingsController_updateSettings")
    .annotate(OpenApi.Summary, "Update sound settings")
    .annotate(OpenApi.Description, "Update user sound settings"),
) {}
