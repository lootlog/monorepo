/** Transport schemas owned by the map-templates HTTP module. */
import * as Schema from "effect/Schema";
import {
  CreateMapTemplateSchema,
  MapTemplateResponseSchema,
} from "../../../map-templates/map-template.schema.js";
import { StatusOkResponseDto_Output } from "../shared.js";

export type MapTemplateResponseDto = typeof MapTemplateResponseSchema.Type;

export const MapTemplateResponseDto = MapTemplateResponseSchema;

export type CreateMapTemplateDto = typeof CreateMapTemplateSchema.Type;

export const CreateMapTemplateDto = CreateMapTemplateSchema;

export type MapTemplatesControllerGetTemplatesPathParams = {
  readonly guildId: string;
};

export const MapTemplatesControllerGetTemplatesPathParams = Schema.Struct({
  guildId: Schema.String,
});

export type MapTemplatesControllerGetTemplates200 =
  ReadonlyArray<MapTemplateResponseDto>;

export const MapTemplatesControllerGetTemplates200 = Schema.Array(
  MapTemplateResponseDto,
);

export type MapTemplatesControllerCreateTemplatePathParams = {
  readonly guildId: string;
};

export const MapTemplatesControllerCreateTemplatePathParams = Schema.Struct({
  guildId: Schema.String,
});

export type MapTemplatesControllerCreateTemplateRequestJson =
  CreateMapTemplateDto;

export const MapTemplatesControllerCreateTemplateRequestJson =
  CreateMapTemplateDto;

export type MapTemplatesControllerCreateTemplate201 = MapTemplateResponseDto;

export const MapTemplatesControllerCreateTemplate201 = MapTemplateResponseDto;

export type MapTemplatesControllerUpdateTemplatePathParams = {
  readonly templateId: string;
  readonly guildId: string;
};

export const MapTemplatesControllerUpdateTemplatePathParams = Schema.Struct({
  templateId: Schema.String,
  guildId: Schema.String,
});

export type MapTemplatesControllerUpdateTemplateRequestJson =
  CreateMapTemplateDto;

export const MapTemplatesControllerUpdateTemplateRequestJson =
  CreateMapTemplateDto;

export type MapTemplatesControllerUpdateTemplate200 = MapTemplateResponseDto;

export const MapTemplatesControllerUpdateTemplate200 = MapTemplateResponseDto;

export type MapTemplatesControllerDeleteTemplatePathParams = {
  readonly templateId: string;
  readonly guildId: string;
};

export const MapTemplatesControllerDeleteTemplatePathParams = Schema.Struct({
  templateId: Schema.String,
  guildId: Schema.String,
});

export type MapTemplatesControllerDeleteTemplate200 =
  StatusOkResponseDto_Output;

export const MapTemplatesControllerDeleteTemplate200 =
  StatusOkResponseDto_Output;
