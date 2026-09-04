/** Endpoints owned by the map-templates HTTP module. */
import {
  HttpApiEndpoint,
  HttpApiGroup,
  HttpApiSchema,
  OpenApi,
} from "effect/unstable/httpapi";
import { BearerSecurityMiddleware } from "../shared.js";
import {
  MapTemplateResponseSchema,
  CreateMapTemplateSchema,
} from "#src/map-templates/map-template.schema";
import {
  MapTemplateOrganizationPath,
  MapTemplatePath,
  MapTemplatesResponse,
} from "#src/contracts/map-templates/schemas";
import { StatusOk } from "#src/contracts/shared";

export class MapTemplatesGroup extends HttpApiGroup.make("map-templates").add(
  HttpApiEndpoint.get(
    "MapTemplatesControllerGetTemplates",
    "/guilds/:guildId/map-templates",
    {
      params: MapTemplateOrganizationPath,
      success: MapTemplatesResponse,
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
      params: MapTemplateOrganizationPath,
      payload: CreateMapTemplateSchema,
      success: MapTemplateResponseSchema.pipe(HttpApiSchema.status(201)),
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
      params: MapTemplatePath,
      payload: CreateMapTemplateSchema,
      success: MapTemplateResponseSchema,
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
      params: MapTemplatePath,
      success: StatusOk,
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "MapTemplatesController_deleteTemplate")
    .annotate(OpenApi.Summary, "Delete map template")
    .annotate(OpenApi.Description, "Delete a map template"),
) {}
