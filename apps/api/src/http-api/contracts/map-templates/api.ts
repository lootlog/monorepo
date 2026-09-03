/** Endpoints owned by the map-templates HTTP module. */
import {
  HttpApiEndpoint,
  HttpApiGroup,
  HttpApiSchema,
  OpenApi,
} from "effect/unstable/httpapi";
import { BearerSecurityMiddleware } from "../shared.js";
import {
  MapTemplatesControllerCreateTemplate201,
  MapTemplatesControllerCreateTemplatePathParams,
  MapTemplatesControllerCreateTemplateRequestJson,
  MapTemplatesControllerDeleteTemplate200,
  MapTemplatesControllerDeleteTemplatePathParams,
  MapTemplatesControllerGetTemplates200,
  MapTemplatesControllerGetTemplatesPathParams,
  MapTemplatesControllerUpdateTemplate200,
  MapTemplatesControllerUpdateTemplatePathParams,
  MapTemplatesControllerUpdateTemplateRequestJson,
} from "./schemas.js";

export class MapTemplatesGroup extends HttpApiGroup.make("map-templates").add(
  HttpApiEndpoint.get(
    "MapTemplatesControllerGetTemplates",
    "/guilds/:guildId/map-templates",
    {
      params: MapTemplatesControllerGetTemplatesPathParams,
      success: MapTemplatesControllerGetTemplates200,
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "MapTemplatesController_getTemplates")
    .annotate(OpenApi.Summary, "Get map templates")
    .annotate(OpenApi.Description, "Get all map templates for this guild"),
  HttpApiEndpoint.post(
    "MapTemplatesControllerCreateTemplate",
    "/guilds/:guildId/map-templates",
    {
      params: MapTemplatesControllerCreateTemplatePathParams,
      payload: MapTemplatesControllerCreateTemplateRequestJson,
      success: MapTemplatesControllerCreateTemplate201.pipe(
        HttpApiSchema.status(201),
      ),
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "MapTemplatesController_createTemplate")
    .annotate(OpenApi.Summary, "Create map template")
    .annotate(OpenApi.Description, "Create a new reusable map template"),
  HttpApiEndpoint.put(
    "MapTemplatesControllerUpdateTemplate",
    "/guilds/:guildId/map-templates/:templateId",
    {
      params: MapTemplatesControllerUpdateTemplatePathParams,
      payload: MapTemplatesControllerUpdateTemplateRequestJson,
      success: MapTemplatesControllerUpdateTemplate200,
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "MapTemplatesController_updateTemplate")
    .annotate(OpenApi.Summary, "Update map template")
    .annotate(OpenApi.Description, "Update an existing reusable map template"),
  HttpApiEndpoint.delete(
    "MapTemplatesControllerDeleteTemplate",
    "/guilds/:guildId/map-templates/:templateId",
    {
      params: MapTemplatesControllerDeleteTemplatePathParams,
      success: MapTemplatesControllerDeleteTemplate200,
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "MapTemplatesController_deleteTemplate")
    .annotate(OpenApi.Summary, "Delete map template")
    .annotate(OpenApi.Description, "Delete a map template"),
) {}
