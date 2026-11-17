import { TaggedError as TaggedErrorClass } from "effect/Schema";
import { Context, Effect, Layer, Schema } from "effect";
import { and, asc, eq } from "drizzle-orm";
import { ApiDatabase } from "#src/database/drizzle/database";
import { mapTemplateTable } from "#src/database/drizzle/map-template.schema";
import type { CreateMapTemplate } from "./map-template.schema.js";

export type StoredMapTemplate = {
  readonly id: string;
  readonly guildId: string;
  readonly name: string;
  readonly maps: unknown;
  readonly createdAt: Date;
};

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
      payload: CreateMapTemplate,
    ) => Effect.Effect<StoredMapTemplate, MapTemplatesPersistenceError>;
    readonly update: (
      guildId: string,
      templateId: string,
      payload: CreateMapTemplate,
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
              id: Bun.randomUUIDv7(),
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
              Effect.mapBoth({
                onSuccess: (rows) => rows[0] ?? null,
                onFailure: persistenceError,
              }),
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
              Effect.mapBoth({
                onSuccess: (rows) => rows.length > 0,
                onFailure: persistenceError,
              }),
            ),
      });
    }),
  );
}
