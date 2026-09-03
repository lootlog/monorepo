/** Endpoints owned by the preferences HTTP module. */
import {
  HttpApiEndpoint,
  HttpApiGroup,
  OpenApi,
} from "effect/unstable/httpapi";
import { BearerSecurityMiddleware } from "../shared.js";
import {
  SettingsDocumentsControllerGetPreferences200,
  SettingsDocumentsControllerGetPreferencesQuery,
  SettingsDocumentsControllerPatchPreferences200,
  SettingsDocumentsControllerPatchPreferencesRequestJson,
} from "./schemas.js";

export class PreferencesGroup extends HttpApiGroup.make("preferences").add(
  HttpApiEndpoint.get(
    "SettingsDocumentsControllerGetPreferences",
    "/preferences",
    {
      query: SettingsDocumentsControllerGetPreferencesQuery,
      success: SettingsDocumentsControllerGetPreferences200,
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "SettingsDocumentsController_getPreferences")
    .annotate(OpenApi.Summary, "Get effective settings for multiple domains"),
  HttpApiEndpoint.patch(
    "SettingsDocumentsControllerPatchPreferences",
    "/preferences",
    {
      payload: SettingsDocumentsControllerPatchPreferencesRequestJson,
      success: SettingsDocumentsControllerPatchPreferences200,
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(
      OpenApi.Identifier,
      "SettingsDocumentsController_patchPreferences",
    )
    .annotate(OpenApi.Summary, "Atomically patch settings in multiple domains"),
) {}
