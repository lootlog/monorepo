/** Shared input and output schemas for the map-templates feature. */
import * as Schema from "effect/Schema";
import { MapTemplateResponseSchema } from "#src/map-templates/map-template.schema";

export type MapTemplateOrganizationPath =
  typeof MapTemplateOrganizationPath.Type;

export const MapTemplateOrganizationPath = Schema.Struct({
  guildId: Schema.String,
});

export type MapTemplatesResponse = typeof MapTemplatesResponse.Type;

export const MapTemplatesResponse = Schema.Array(MapTemplateResponseSchema);

export type MapTemplatePath = typeof MapTemplatePath.Type;

export const MapTemplatePath = Schema.Struct({
  templateId: Schema.String,
  guildId: Schema.String,
});
