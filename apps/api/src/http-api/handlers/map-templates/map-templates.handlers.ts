import { Context, Effect, Layer, Schema } from "effect";
import { HttpApiBuilder } from "effect/unstable/httpapi";
import {
  Permission,
  type Permission as PermissionValue,
} from "@lootlog/schema/permissions";
import type { MapTemplatesRepository } from "#src/map-templates/map-templates.repository";
import {
  LootlogApi,
  MapTemplateResponseDto,
  type CreateMapTemplateDto,
  type MapTemplateResponseDto as MapTemplateResponse,
} from "../../lootlog-api.generated.js";

type StoredMapTemplate = {
  readonly id: string;
  readonly guildId: string;
  readonly name: string;
  readonly maps: unknown;
  readonly createdAt: Date;
};

// oxlint-disable-next-line unicorn/throw-new-error -- Schema.TaggedError is a class factory.
export class MapTemplatesAccessDenied extends Schema.TaggedError<MapTemplatesAccessDenied>()(
  "MapTemplatesAccessDenied",
  {
    status: Schema.Literals([401, 403, 404]),
    code: Schema.String,
  },
) {}

// oxlint-disable-next-line unicorn/throw-new-error -- Schema.TaggedError is a class factory.
export class MapTemplateNotFound extends Schema.TaggedError<MapTemplateNotFound>()(
  "MapTemplateNotFound",
  {
    status: Schema.Literal(404),
    code: Schema.Literal("MAP_TEMPLATE_NOT_FOUND"),
  },
) {}

// oxlint-disable-next-line unicorn/throw-new-error -- Schema.TaggedError is a class factory.
export class MapTemplatesPersistenceError extends Schema.TaggedError<MapTemplatesPersistenceError>()(
  "MapTemplatesPersistenceError",
  {
    cause: Schema.Defect(),
  },
) {}

export class MapTemplatesAuthorization extends Context.Service<
  MapTemplatesAuthorization,
  {
    readonly requireCapability: (options: {
      readonly guildId: string;
      readonly capability: PermissionValue;
    }) => Effect.Effect<{ readonly guildId: string }, MapTemplatesAccessDenied>;
  }
>()("@lootlog/api/http-api/map-templates/authorization") {}

export class MapTemplatesData extends Context.Service<
  MapTemplatesData,
  {
    readonly findMany: (
      guildId: string,
    ) => Effect.Effect<
      ReadonlyArray<StoredMapTemplate>,
      MapTemplatesPersistenceError
    >;
    readonly create: (
      guildId: string,
      payload: CreateMapTemplateDto,
    ) => Effect.Effect<StoredMapTemplate, MapTemplatesPersistenceError>;
    readonly update: (
      guildId: string,
      templateId: string,
      payload: CreateMapTemplateDto,
    ) => Effect.Effect<StoredMapTemplate | null, MapTemplatesPersistenceError>;
    readonly delete: (
      guildId: string,
      templateId: string,
    ) => Effect.Effect<boolean, MapTemplatesPersistenceError>;
  }
>()("@lootlog/api/http-api/map-templates/data") {
  static layerRepository(repository: MapTemplatesRepository) {
    const attempt = <A>(operation: () => PromiseLike<A>) =>
      Effect.tryPromise({
        try: operation,
        catch: (cause) => new MapTemplatesPersistenceError({ cause }),
      });

    return Layer.succeed(
      MapTemplatesData,
      MapTemplatesData.of({
        findMany: (guildId) => attempt(() => repository.findMany(guildId)),
        create: (guildId, payload) =>
          attempt(() => repository.create(guildId, payload.name, payload.maps)),
        update: (guildId, templateId, payload) =>
          attempt(() =>
            repository.update(guildId, templateId, payload.name, payload.maps),
          ),
        delete: (guildId, templateId) =>
          attempt(() => repository.delete(guildId, templateId)),
      }),
    );
  }
}

const decodeResponse = (template: StoredMapTemplate) =>
  Schema.decodeUnknownEffect(MapTemplateResponseDto)({
    ...template,
    createdAt: template.createdAt.toISOString(),
  }).pipe(
    Effect.mapError((cause) => new MapTemplatesPersistenceError({ cause })),
  );

const authorize = (guildId: string, capability: PermissionValue) =>
  Effect.flatMap(MapTemplatesAuthorization, (authorization) =>
    authorization.requireCapability({ guildId, capability }),
  );

export const getMapTemplates = Effect.fn("getMapTemplates")(function* (
  guildId: string,
) {
  const access = yield* authorize(guildId, Permission.LOOTLOG_ACCESS);
  const templates = yield* Effect.flatMap(MapTemplatesData, (data) =>
    data.findMany(access.guildId),
  );
  return yield* Effect.forEach(templates, decodeResponse);
});

export const createMapTemplate = Effect.fn("createMapTemplate")(function* (
  guildId: string,
  payload: CreateMapTemplateDto,
) {
  const access = yield* authorize(guildId, Permission.LOOTLOG_MANAGE);
  const template = yield* Effect.flatMap(MapTemplatesData, (data) =>
    data.create(access.guildId, payload),
  );
  return yield* decodeResponse(template);
});

export const updateMapTemplate = Effect.fn("updateMapTemplate")(function* (
  guildId: string,
  templateId: string,
  payload: CreateMapTemplateDto,
) {
  const access = yield* authorize(guildId, Permission.LOOTLOG_MANAGE);
  const template = yield* Effect.flatMap(MapTemplatesData, (data) =>
    data.update(access.guildId, templateId, payload),
  );
  if (template === null) {
    return yield* new MapTemplateNotFound({
      status: 404,
      code: "MAP_TEMPLATE_NOT_FOUND",
    });
  }
  return yield* decodeResponse(template);
});

export const deleteMapTemplate = Effect.fn("deleteMapTemplate")(function* (
  guildId: string,
  templateId: string,
) {
  const access = yield* authorize(guildId, Permission.LOOTLOG_MANAGE);
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

const orDieHttpFailure = <A, E, R>(effect: Effect.Effect<A, E, R>) =>
  Effect.catch(effect, (error) => Effect.die(error));

export const MapTemplatesHandlers = HttpApiBuilder.group(
  LootlogApi,
  "map-templates",
  (handlers) =>
    handlers
      .handle("MapTemplatesControllerGetTemplates", ({ params }) =>
        orDieHttpFailure(getMapTemplates(params.guildId)),
      )
      .handle("MapTemplatesControllerCreateTemplate", ({ params, payload }) =>
        orDieHttpFailure(createMapTemplate(params.guildId, payload)),
      )
      .handle("MapTemplatesControllerUpdateTemplate", ({ params, payload }) =>
        orDieHttpFailure(
          updateMapTemplate(params.guildId, params.templateId, payload),
        ),
      )
      .handle("MapTemplatesControllerDeleteTemplate", ({ params }) =>
        orDieHttpFailure(deleteMapTemplate(params.guildId, params.templateId)),
      ),
);

export type { MapTemplateResponse };
