import { TaggedError as TaggedErrorClass } from "effect/Schema";
import { Clock, Context, Effect, Layer, Schema } from "effect";
import { and, asc, count, eq, sql } from "drizzle-orm";
import { ApiDatabase } from "#src/database/drizzle/database";
import { userEquipmentSetTable } from "#src/database/drizzle/equipment-set.schema";
import { readUserEntitlements } from "#src/plans/entitlements";
import type {
  CreateUserEquipmentSetRequest,
  UpdateUserEquipmentSetRequest,
} from "#src/contracts/user-equipment-sets/schemas";

export type StoredUserEquipmentSet = typeof userEquipmentSetTable.$inferSelect;

export class UserEquipmentSetNotFound extends TaggedErrorClass<
  UserEquipmentSetNotFound,
  { readonly brand: unique symbol }
>()("UserEquipmentSetNotFound", { status: Schema.Literal(404) }) {}

export class UserEquipmentSetLimitReached extends TaggedErrorClass<
  UserEquipmentSetLimitReached,
  { readonly brand: unique symbol }
>()("UserEquipmentSetLimitReached", {
  equipmentSetLimit: Schema.Int,
}) {}

export class UserEquipmentSetsPersistenceError extends TaggedErrorClass<
  UserEquipmentSetsPersistenceError,
  { readonly brand: unique symbol }
>()("UserEquipmentSetsPersistenceError", { cause: Schema.Defect() }) {}

type Persisted<A> = Effect.Effect<A, UserEquipmentSetsPersistenceError>;

export class UserEquipmentSetsData extends Context.Service<
  UserEquipmentSetsData,
  {
    readonly findMany: (
      userId: string,
    ) => Persisted<ReadonlyArray<StoredUserEquipmentSet>>;
    readonly create: (
      userId: string,
      payload: CreateUserEquipmentSetRequest,
    ) => Effect.Effect<
      StoredUserEquipmentSet,
      UserEquipmentSetLimitReached | UserEquipmentSetsPersistenceError
    >;
    readonly update: (
      userId: string,
      setId: string,
      payload: UpdateUserEquipmentSetRequest,
    ) => Persisted<StoredUserEquipmentSet | null>;
    readonly delete: (userId: string, setId: string) => Persisted<boolean>;
  }
>()("@lootlog/api/http-api/user-equipment-sets/data") {
  static readonly layerDatabase = Layer.effect(
    UserEquipmentSetsData,
    Effect.map(ApiDatabase, (database) => {
      const persisted = <A, E>(effect: Effect.Effect<A, E>) =>
        effect.pipe(
          Effect.mapError(
            (cause) => new UserEquipmentSetsPersistenceError({ cause }),
          ),
        );

      const ownSet = (userId: string, setId: string) =>
        and(
          eq(userEquipmentSetTable.id, setId),
          eq(userEquipmentSetTable.userId, userId),
        );

      const now = Effect.map(
        Clock.currentTimeMillis,
        (millis) => new Date(millis),
      );

      return UserEquipmentSetsData.of({
        findMany: (userId) =>
          persisted(
            database
              .select()
              .from(userEquipmentSetTable)
              .where(eq(userEquipmentSetTable.userId, userId))
              .orderBy(
                asc(userEquipmentSetTable.createdAt),
                asc(userEquipmentSetTable.id),
              ),
          ),
        create: (userId, payload) =>
          database
            .transaction((transaction) =>
              Effect.gen(function* () {
                yield* transaction.execute(
                  sql`SELECT pg_advisory_xact_lock(hashtext(${`user-equipment-set:${userId}`}))`,
                );

                const [existing] = yield* transaction
                  .select({ value: count() })
                  .from(userEquipmentSetTable)
                  .where(eq(userEquipmentSetTable.userId, userId));

                const { equipmentSets } = yield* readUserEntitlements(
                  transaction,
                  userId,
                );

                if ((existing?.value ?? 0) >= equipmentSets) {
                  return yield* new UserEquipmentSetLimitReached({
                    equipmentSetLimit: equipmentSets,
                  });
                }

                const createdAt = yield* now;

                const [created] = yield* transaction
                  .insert(userEquipmentSetTable)
                  .values({
                    id: Bun.randomUUIDv7(),
                    userId,
                    name: payload.name,
                    description: payload.description ?? "",
                    code: payload.code,
                    createdAt,
                    updatedAt: createdAt,
                  })
                  .returning();

                if (!created) {
                  return yield* Effect.die(
                    new Error("Equipment set insert returned no row"),
                  );
                }

                return created;
              }),
            )
            .pipe(
              Effect.mapError((cause) =>
                cause instanceof UserEquipmentSetLimitReached
                  ? cause
                  : new UserEquipmentSetsPersistenceError({ cause }),
              ),
            ),
        update: (userId, setId, payload) =>
          persisted(
            Effect.gen(function* () {
              const updatedAt = yield* now;

              const [updated] = yield* database
                .update(userEquipmentSetTable)
                .set({ ...payload, updatedAt })
                .where(ownSet(userId, setId))
                .returning();

              return updated ?? null;
            }),
          ),
        delete: (userId, setId) =>
          persisted(
            database
              .delete(userEquipmentSetTable)
              .where(ownSet(userId, setId))
              .returning({ id: userEquipmentSetTable.id })
              .pipe(Effect.map((rows) => rows.length > 0)),
          ),
      });
    }),
  );
}
