/** Endpoints owned by the preferences HTTP module. */
import {
  HttpApiEndpoint,
  HttpApiGroup,
  HttpApiSchema,
  OpenApi,
} from "effect/unstable/httpapi";
import { BearerSecurityMiddleware, HttpErrorResponse } from "../shared.js";
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
      error: [400, 403].map((status) =>
        HttpErrorResponse.pipe(HttpApiSchema.status(status)),
      ),
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
      error: [400, 403].map((status) =>
        HttpErrorResponse.pipe(HttpApiSchema.status(status)),
      ),
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(
      OpenApi.Identifier,
      "SettingsDocumentsController_patchPreferences",
    )
    .annotate(OpenApi.Summary, "Atomically patch settings in multiple domains"),
) {}
