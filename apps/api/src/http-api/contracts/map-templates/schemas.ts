/** Transport schemas owned by the map-templates HTTP module. */
import * as Schema from "effect/Schema";
import {
  CreateMapTemplateSchema,
  MapTemplateResponseSchema,
} from "../../../map-templates/map-template.schema.js";
import { StatusOkResponseDto_Output } from "../shared.js";

export type MapTemplateResponseDto = typeof MapTemplateResponseDto.Type;

export const MapTemplateResponseDto = MapTemplateResponseSchema;

export type CreateMapTemplateDto = typeof CreateMapTemplateDto.Type;

export const CreateMapTemplateDto = CreateMapTemplateSchema;

export type MapTemplatesControllerGetTemplatesPathParams =
  typeof MapTemplatesControllerGetTemplatesPathParams.Type;

export const MapTemplatesControllerGetTemplatesPathParams = Schema.Struct({
  guildId: Schema.String,
});

export type MapTemplatesControllerGetTemplates200 =
  typeof MapTemplatesControllerGetTemplates200.Type;

export const MapTemplatesControllerGetTemplates200 = Schema.Array(
  MapTemplateResponseDto,
);

export type MapTemplatesControllerCreateTemplatePathParams =
  typeof MapTemplatesControllerCreateTemplatePathParams.Type;

export const MapTemplatesControllerCreateTemplatePathParams = Schema.Struct({
  guildId: Schema.String,
});

export type MapTemplatesControllerCreateTemplateRequestJson =
  typeof MapTemplatesControllerCreateTemplateRequestJson.Type;

export const MapTemplatesControllerCreateTemplateRequestJson =
  CreateMapTemplateDto;

export type MapTemplatesControllerCreateTemplate201 =
  typeof MapTemplatesControllerCreateTemplate201.Type;

export const MapTemplatesControllerCreateTemplate201 = MapTemplateResponseDto;

export type MapTemplatesControllerUpdateTemplatePathParams =
  typeof MapTemplatesControllerUpdateTemplatePathParams.Type;

export const MapTemplatesControllerUpdateTemplatePathParams = Schema.Struct({
  templateId: Schema.String,
  guildId: Schema.String,
});

export type MapTemplatesControllerUpdateTemplateRequestJson =
  typeof MapTemplatesControllerUpdateTemplateRequestJson.Type;

export const MapTemplatesControllerUpdateTemplateRequestJson =
  CreateMapTemplateDto;

export type MapTemplatesControllerUpdateTemplate200 =
  typeof MapTemplatesControllerUpdateTemplate200.Type;

export const MapTemplatesControllerUpdateTemplate200 = MapTemplateResponseDto;

export type MapTemplatesControllerDeleteTemplatePathParams =
  typeof MapTemplatesControllerDeleteTemplatePathParams.Type;

export const MapTemplatesControllerDeleteTemplatePathParams = Schema.Struct({
  templateId: Schema.String,
  guildId: Schema.String,
});

export type MapTemplatesControllerDeleteTemplate200 =
  typeof MapTemplatesControllerDeleteTemplate200.Type;

export const MapTemplatesControllerDeleteTemplate200 =
  StatusOkResponseDto_Output;
