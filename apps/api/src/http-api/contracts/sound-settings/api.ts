/** Endpoints owned by the sound-settings HTTP module. */
import {
  HttpApiEndpoint,
  HttpApiGroup,
  HttpApiSchema,
  OpenApi,
} from "effect/unstable/httpapi";
import { BearerSecurityMiddleware, HttpErrorResponse } from "../shared.js";
import {
  SoundSettingsResponse,
  UpdateSoundSettingsRequest,
} from "#src/contracts/sound-settings/schemas";

export class SoundSettingsGroup extends HttpApiGroup.make("sound-settings").add(
  HttpApiEndpoint.get("SoundSettingsControllerGetSettings", "/sound-settings", {
    success: SoundSettingsResponse,
  })
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "SoundSettingsController_getSettings")
    .annotate(OpenApi.Summary, "Get sound settings")
    .annotate(OpenApi.Description, "Retrieve user sound settings"),
  HttpApiEndpoint.patch(
    "SoundSettingsControllerUpdateSettings",
    "/sound-settings",
    {
      payload: UpdateSoundSettingsRequest,
      success: SoundSettingsResponse,
      error: HttpErrorResponse.pipe(HttpApiSchema.status(400)),
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "SoundSettingsController_updateSettings")
    .annotate(OpenApi.Summary, "Update sound settings")
    .annotate(OpenApi.Description, "Update user sound settings"),
) {}
