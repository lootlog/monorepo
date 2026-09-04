/** Endpoints owned by the preferences HTTP module. */
import {
  HttpApiEndpoint,
  HttpApiGroup,
  OpenApi,
} from "effect/unstable/httpapi";
import { BearerSecurityMiddleware } from "../shared.js";
import {
  SettingsDocumentsResponseSchema,
  SettingsDocumentsQuerySchema,
  PatchSettingsDocumentsSchema,
} from "@lootlog/schema/settings-documents";

export class PreferencesGroup extends HttpApiGroup.make("preferences").add(
  HttpApiEndpoint.get(
    "SettingsDocumentsControllerGetPreferences",
    "/preferences",
    {
      query: SettingsDocumentsQuerySchema,
      success: SettingsDocumentsResponseSchema,
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "SettingsDocumentsController_getPreferences")
    .annotate(OpenApi.Summary, "Get effective settings for multiple domains"),
  HttpApiEndpoint.patch(
    "SettingsDocumentsControllerPatchPreferences",
    "/preferences",
    {
      payload: PatchSettingsDocumentsSchema,
      success: SettingsDocumentsResponseSchema,
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(
      OpenApi.Identifier,
      "SettingsDocumentsController_patchPreferences",
    )
    .annotate(OpenApi.Summary, "Atomically patch settings in multiple domains"),
) {}
