import { TaggedError as TaggedErrorClass } from "effect/Schema";
import { Clock, Context, Effect, Layer, Schema } from "effect";
import { and, asc, count, eq, isNull, sql } from "drizzle-orm";
import {
  BuiltInThemeIdSchema,
  CUSTOM_THEME_LIMIT,
  CUSTOM_THEME_PREFERENCE_PREFIX,
} from "@lootlog/schema/custom-theme";
import { ApiDatabase } from "#src/database/drizzle/database";
import {
  userSettingsTable,
  userThemeTable,
} from "#src/database/drizzle/user.schema";
import type {
  CreateUserThemeRequest,
  UpdateUserThemeRequest,
} from "#src/contracts/user-themes/schemas";

export type StoredUserTheme = typeof userThemeTable.$inferSelect;

export class UserThemeNotFound extends TaggedErrorClass<
  UserThemeNotFound,
  { readonly brand: unique symbol }
>()("UserThemeNotFound", { status: Schema.Literal(404) }) {}

export class UserThemeLimitReached extends TaggedErrorClass<
  UserThemeLimitReached,
  { readonly brand: unique symbol }
>()("UserThemeLimitReached", {
  status: Schema.Literal(409),
  code: Schema.Literal("USER_THEME_LIMIT_REACHED"),
}) {}

export class UserThemesPersistenceError extends TaggedErrorClass<
  UserThemesPersistenceError,
  { readonly brand: unique symbol }
>()("UserThemesPersistenceError", { cause: Schema.Defect() }) {}

export type Persisted<A> = Effect.Effect<A, UserThemesPersistenceError>;

export class UserThemesData extends Context.Service<
  UserThemesData,
  {
    readonly findMany: (
      userId: string,
    ) => Persisted<ReadonlyArray<StoredUserTheme>>;
    readonly find: (
      userId: string,
      themeId: string,
    ) => Persisted<StoredUserTheme | null>;
    readonly create: (
      userId: string,
      payload: CreateUserThemeRequest,
    ) => Persisted<StoredUserTheme | null>;
    readonly update: (
      userId: string,
      themeId: string,
      payload: UpdateUserThemeRequest,
    ) => Persisted<StoredUserTheme | null>;
    readonly delete: (userId: string, themeId: string) => Persisted<boolean>;
    readonly claimShareToken: (
      userId: string,
      themeId: string,
      shareToken: string,
    ) => Persisted<StoredUserTheme | null>;
    readonly clearShareToken: (
      userId: string,
      themeId: string,
    ) => Persisted<StoredUserTheme | null>;
    readonly findShared: (
      shareToken: string,
    ) => Persisted<StoredUserTheme | null>;
  }
>()("@lootlog/api/http-api/user-themes/data") {
  static readonly layerDatabase = Layer.effect(
    UserThemesData,
    Effect.map(ApiDatabase, (database) => {
      const persisted = <A, E>(effect: Effect.Effect<A, E>) =>
        effect.pipe(
          Effect.mapError((cause) => new UserThemesPersistenceError({ cause })),
        );

      const ownTheme = (userId: string, themeId: string) =>
        and(eq(userThemeTable.id, themeId), eq(userThemeTable.userId, userId));

      const now = Effect.map(
        Clock.currentTimeMillis,
        (millis) => new Date(millis),
      );

      return UserThemesData.of({
        findMany: (userId) =>
          persisted(
            database
              .select()
              .from(userThemeTable)
              .where(eq(userThemeTable.userId, userId))
              .orderBy(asc(userThemeTable.createdAt)),
          ),
        find: (userId, themeId) =>
          persisted(
            database
              .select()
              .from(userThemeTable)
              .where(ownTheme(userId, themeId))
              .limit(1)
              .pipe(Effect.map((rows) => rows[0] ?? null)),
          ),
        create: (userId, payload) =>
          persisted(
            database.transaction((transaction) =>
              Effect.gen(function* () {
                yield* transaction.execute(
                  sql`SELECT pg_advisory_xact_lock(hashtext(${`user-theme:${userId}`}))`,
                );

                const [existing] = yield* transaction
                  .select({ value: count() })
                  .from(userThemeTable)
                  .where(eq(userThemeTable.userId, userId));

                if ((existing?.value ?? 0) >= CUSTOM_THEME_LIMIT) return null;

                const createdAt = yield* now;

                const [theme] = yield* transaction
                  .insert(userThemeTable)
                  .values({
                    id: Bun.randomUUIDv7(),
                    userId,
                    name: payload.name,
                    definition: payload.definition,
                    createdAt,
                    updatedAt: createdAt,
                  })
                  .returning();

                return theme ?? null;
              }),
            ),
          ),
        update: (userId, themeId, payload) =>
          persisted(
            Effect.gen(function* () {
              const updatedAt = yield* now;

              const rows = yield* database
                .update(userThemeTable)
                .set({
                  ...(payload.name !== undefined && { name: payload.name }),
                  ...(payload.definition !== undefined && {
                    definition: payload.definition,
                  }),
                  updatedAt,
                })
                .where(ownTheme(userId, themeId))
                .returning();

              return rows[0] ?? null;
            }),
          ),
        delete: (userId, themeId) =>
          persisted(
            database.transaction((transaction) =>
              Effect.gen(function* () {
                const [deleted] = yield* transaction
                  .delete(userThemeTable)
                  .where(ownTheme(userId, themeId))
                  .returning({ definition: userThemeTable.definition });

                if (!deleted) return false;

                const { baseThemeId } = yield* Schema.decodeUnknownEffect(
                  Schema.Struct({ baseThemeId: BuiltInThemeIdSchema }),
                )(deleted.definition);

                yield* transaction
                  .update(userSettingsTable)
                  .set({ theme: baseThemeId, updatedAt: yield* now })
                  .where(
                    and(
                      eq(userSettingsTable.userId, userId),
                      eq(
                        userSettingsTable.theme,
                        `${CUSTOM_THEME_PREFERENCE_PREFIX}${themeId}`,
                      ),
                    ),
                  );

                return true;
              }),
            ),
          ),
        claimShareToken: (userId, themeId, shareToken) =>
          persisted(
            Effect.gen(function* () {
              const updatedAt = yield* now;

              const [claimed] = yield* database
                .update(userThemeTable)
                .set({ shareToken, updatedAt })
                .where(
                  and(
                    ownTheme(userId, themeId),
                    isNull(userThemeTable.shareToken),
                  ),
                )
                .returning();

              if (claimed) return claimed;

              const [current] = yield* database
                .select()
                .from(userThemeTable)
                .where(ownTheme(userId, themeId))
                .limit(1);

              return current ?? null;
            }),
          ),
        clearShareToken: (userId, themeId) =>
          persisted(
            Effect.gen(function* () {
              const updatedAt = yield* now;

              const rows = yield* database
                .update(userThemeTable)
                .set({ shareToken: null, updatedAt })
                .where(ownTheme(userId, themeId))
                .returning();

              return rows[0] ?? null;
            }),
          ),
        findShared: (shareToken) =>
          persisted(
            database
              .select()
              .from(userThemeTable)
              .where(eq(userThemeTable.shareToken, shareToken))
              .limit(1)
              .pipe(Effect.map((rows) => rows[0] ?? null)),
          ),
      });
    }),
  );
}
