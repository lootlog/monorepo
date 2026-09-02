import { TaggedError as TaggedErrorClass } from "effect/Schema";
import { randomUUID } from "node:crypto";
import { Context, Effect, Layer, Schema } from "effect";
import { HttpApiBuilder } from "effect/unstable/httpapi";
import { and, asc, eq } from "drizzle-orm";
import {
  Permission,
  type Permission as PermissionValue,
} from "@lootlog/schema/permissions";
import { ApiDatabase } from "#src/database/drizzle/database";
import { mapTemplateTable } from "#src/database/drizzle/schema";
import {
  MapTemplateResponseSchema,
  type MapTemplateResponse,
} from "#src/map-templates/map-template.schema";
import { LootlogApi, type CreateMapTemplateDto } from "../../lootlog-api.js";

type StoredMapTemplate = {
  readonly id: string;
  readonly guildId: string;
  readonly name: string;
  readonly maps: unknown;
  readonly createdAt: Date;
};

export class MapTemplatesAccessDenied extends TaggedErrorClass<MapTemplatesAccessDenied>()(
  "MapTemplatesAccessDenied",
  {
    status: Schema.Literals([401, 403, 404]),
    code: Schema.String,
  },
) {}

export class MapTemplateNotFound extends TaggedErrorClass<MapTemplateNotFound>()(
  "MapTemplateNotFound",
  {
    status: Schema.Literal(404),
    code: Schema.Literal("MAP_TEMPLATE_NOT_FOUND"),
  },
) {}

export class MapTemplatesPersistenceError extends TaggedErrorClass<MapTemplatesPersistenceError>()(
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
  static readonly layerDatabase = Layer.effect(
    MapTemplatesData,
    Effect.map(ApiDatabase, (database) => {
      const persistenceError = (cause: unknown) =>
        new MapTemplatesPersistenceError({ cause });
      return MapTemplatesData.of({
        findMany: (guildId) =>
          database
            .select()
            .from(mapTemplateTable)
            .where(eq(mapTemplateTable.guildId, guildId))
            .orderBy(asc(mapTemplateTable.name))
            .pipe(Effect.mapError(persistenceError)),
        create: (guildId, payload) =>
          database
            .insert(mapTemplateTable)
            .values({
              id: randomUUID(),
              guildId,
              name: payload.name,
              maps: [...payload.maps],
            })
            .returning()
            .pipe(
              Effect.flatMap((rows) =>
                rows[0]
                  ? Effect.succeed(rows[0])
                  : Effect.fail(
                      persistenceError("Map template insert returned no row"),
                    ),
              ),
              Effect.mapError(persistenceError),
            ),
        update: (guildId, templateId, payload) =>
          database
            .update(mapTemplateTable)
            .set({ name: payload.name, maps: [...payload.maps] })
            .where(
              and(
                eq(mapTemplateTable.id, templateId),
                eq(mapTemplateTable.guildId, guildId),
              ),
            )
            .returning()
            .pipe(
              Effect.map((rows) => rows[0] ?? null),
              Effect.mapError(persistenceError),
            ),
        delete: (guildId, templateId) =>
          database
            .delete(mapTemplateTable)
            .where(
              and(
                eq(mapTemplateTable.id, templateId),
                eq(mapTemplateTable.guildId, guildId),
              ),
            )
            .returning({ id: mapTemplateTable.id })
            .pipe(
              Effect.map((rows) => rows.length > 0),
              Effect.mapError(persistenceError),
            ),
      });
    }),
  );
}

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

export const getMapTemplates = Effect.fn("getMapTemplates")(function* (
  guildId: string,
) {
  const access = yield* authorize(guildId, Permission.LOOTLOG_ACCESS);
  const templates = yield* Effect.flatMap(MapTemplatesData, (data) =>
    data.findMany(access.guildId),
  );
  return yield* Effect.forEach(templates, decodeStoredTemplate);
});

export const createMapTemplate = Effect.fn("createMapTemplate")(function* (
  guildId: string,
  payload: CreateMapTemplateDto,
) {
  const access = yield* authorize(guildId, Permission.LOOTLOG_MANAGE);
  const template = yield* Effect.flatMap(MapTemplatesData, (data) =>
    data.create(access.guildId, payload),
  );
  return yield* decodeStoredTemplate(template);
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
  return yield* decodeStoredTemplate(template);
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
