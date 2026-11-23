import type { ForwardAuthIdentity } from "#src/runtime/auth/forward-auth-identity";
import {
  type ReauthenticationRequired,
  reauthenticationRequiredResponse,
} from "@lootlog/protocol/http/errors";
import {
  type StoredMapTemplate,
  MapTemplateNotFound,
  MapTemplatesPersistenceError,
  MapTemplatesData,
} from "#src/map-templates/map-templates-data";
import { statusCodeResponse } from "#src/shared/http/handler-response";
import { TaggedError as TaggedErrorClass } from "effect/Schema";
import { Context, Effect, Schema } from "effect";

import { HttpApiBuilder } from "effect/http-api";

import {
  Capability,
  type Capability as PermissionValue,
} from "@lootlog/schema/permissions";

import {
  MapTemplateResponseSchema,
  type CreateMapTemplate,
} from "#src/map-templates/map-template.schema";
import { LootlogApi } from "../../lootlog-api.js";

export class MapTemplatesAccessDenied extends TaggedErrorClass<
  MapTemplatesAccessDenied,
  { readonly brand: unique symbol }
>()("MapTemplatesAccessDenied", {
  status: Schema.Literals([401, 403, 404]),
  code: Schema.String,
}) {}

export class MapTemplatesAuthorization extends Context.Service<
  MapTemplatesAuthorization,
  {
    readonly requireCapability: (options: {
      readonly guildId: string;
      readonly capability: PermissionValue;
    }) => Effect.Effect<
      { readonly guildId: string },
      MapTemplatesAccessDenied | ReauthenticationRequired,
      ForwardAuthIdentity
    >;
  }
>()("@lootlog/api/http-api/map-templates/authorization") {}

const decodeStoredTemplate = (template: StoredMapTemplate) =>
  Schema.decodeUnknownEffect(Schema.toType(MapTemplateResponseSchema))(
    template,
  ).pipe(
    Effect.mapError((cause) => new MapTemplatesPersistenceError({ cause })),
  );

const authorize = (guildId: string, capability: PermissionValue) =>
  Effect.flatMap(MapTemplatesAuthorization, (authorization) =>
    authorization.requireCapability({ guildId, capability }),
  );

const getMapTemplates = Effect.fn("getMapTemplates")(function* (
  guildId: string,
) {
  const access = yield* authorize(guildId, Capability.LOOTLOG_ACCESS);

  const templates = yield* Effect.flatMap(MapTemplatesData, (data) =>
    data.findMany(access.guildId),
  );

  return yield* Effect.forEach(templates, decodeStoredTemplate);
});

export const createMapTemplate = Effect.fn("createMapTemplate")(function* (
  guildId: string,
  payload: CreateMapTemplate,
) {
  const access = yield* authorize(guildId, Capability.LOOTLOG_MANAGE);

  const template = yield* Effect.flatMap(MapTemplatesData, (data) =>
    data.create(access.guildId, payload),
  );

  return yield* decodeStoredTemplate(template);
});

export const updateMapTemplate = Effect.fn("updateMapTemplate")(function* (
  guildId: string,
  templateId: string,
  payload: CreateMapTemplate,
) {
  const access = yield* authorize(guildId, Capability.LOOTLOG_MANAGE);

  const template = yield* Effect.flatMap(MapTemplatesData, (data) =>
    data.update(access.guildId, templateId, payload),
  );

  if (template === null) {
    return yield* new MapTemplateNotFound({
      status: 404,
      code: "MAP_TEMPLATE_NOT_FOUND",
    });
  }

  return yield* decodeStoredTemplate(template);
});

const deleteMapTemplate = Effect.fn("deleteMapTemplate")(function* (
  guildId: string,
  templateId: string,
) {
  const access = yield* authorize(guildId, Capability.LOOTLOG_MANAGE);

  const deleted = yield* Effect.flatMap(MapTemplatesData, (data) =>
    data.delete(access.guildId, templateId),
  );

  if (!deleted) {
    return yield* new MapTemplateNotFound({
      status: 404,
      code: "MAP_TEMPLATE_NOT_FOUND",
    });
  }

  return { status: "OK" as const };
});

type MapTemplatesHttpFailure =
  | MapTemplateNotFound
  | MapTemplatesAccessDenied
  | MapTemplatesPersistenceError
  | ReauthenticationRequired;

const toHttpResponse = <A, R>(
  effect: Effect.Effect<A, MapTemplatesHttpFailure, R>,
) =>
  Effect.catchTags(effect, {
    MapTemplateNotFound: statusCodeResponse,
    MapTemplatesAccessDenied: statusCodeResponse,
    ReauthenticationRequired: reauthenticationRequiredResponse,
    MapTemplatesPersistenceError: (error) => Effect.die(error.cause),
  });

export const MapTemplatesHandlers = HttpApiBuilder.group(
  LootlogApi,
  "map-templates",
  (handlers) =>
    handlers
      .handle("MapTemplatesControllerGetTemplates", ({ params }) =>
        toHttpResponse(getMapTemplates(params.guildId)),
      )
      .handle("MapTemplatesControllerCreateTemplate", ({ params, payload }) =>
        toHttpResponse(createMapTemplate(params.guildId, payload)),
      )
      .handle("MapTemplatesControllerUpdateTemplate", ({ params, payload }) =>
        toHttpResponse(
          updateMapTemplate(params.guildId, params.templateId, payload),
        ),
      )
      .handle("MapTemplatesControllerDeleteTemplate", ({ params }) =>
        toHttpResponse(deleteMapTemplate(params.guildId, params.templateId)),
      ),
);
