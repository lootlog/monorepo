import {
  emptyStatusResponse,
  reauthenticationRequiredResponse,
  statusCodeResponse,
} from "#src/shared/http/handler-response";
import { TaggedError as TaggedErrorClass } from "effect/Schema";
import { randomBytes, randomUUID } from "node:crypto";
import { Clock, Context, Effect, Layer, Schema } from "effect";
import { HttpApiBuilder } from "effect/http-api";
import { and, asc, count, eq, sql } from "drizzle-orm";
import {
  BuiltInThemeIdSchema,
  CUSTOM_THEME_LIMIT,
  CUSTOM_THEME_PREFERENCE_PREFIX,
} from "@lootlog/schema/custom-theme";
import { ApiDatabase } from "#src/database/drizzle/database";
import {
  userSettingsTable,
  userThemeTable,
} from "#src/database/drizzle/schema";
import { LootlogApi } from "../../lootlog-api.js";
import type { ReauthenticationRequired } from "#src/http-api/contracts/shared";
import {
  SharedUserThemeResponse,
  UserThemeResponse,
  type CreateUserThemeRequest,
  type UpdateUserThemeRequest,
} from "#src/contracts/user-themes/schemas";

type StoredUserTheme = typeof userThemeTable.$inferSelect;

export class UserThemeNotFound extends TaggedErrorClass<UserThemeNotFound>()(
  "UserThemeNotFound",
  { status: Schema.Literal(404) },
) {}

export class UserThemeLimitReached extends TaggedErrorClass<UserThemeLimitReached>()(
  "UserThemeLimitReached",
  {
    status: Schema.Literal(409),
    code: Schema.Literal("USER_THEME_LIMIT_REACHED"),
  },
) {}

export class UserThemesPersistenceError extends TaggedErrorClass<UserThemesPersistenceError>()(
  "UserThemesPersistenceError",
  { cause: Schema.Defect() },
) {}

export class UserThemesIdentity extends Context.Service<
  UserThemesIdentity,
  { readonly userId: Effect.Effect<string> }
>()("@lootlog/api/http-api/user-themes/identity") {}

type Persisted<A> = Effect.Effect<A, UserThemesPersistenceError>;

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
    /** Returns `null` once the User already has `CUSTOM_THEME_LIMIT` themes. */
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
    readonly setShareToken: (
      userId: string,
      themeId: string,
      shareToken: string | null,
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
                // Serializes one User's creates so parallel requests cannot
                // pass the limit check together.
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
                    id: randomUUID(),
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

                // A User who had the theme selected keeps its look's base
                // instead of pointing at a theme that no longer exists.
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
        setShareToken: (userId, themeId, shareToken) =>
          persisted(
            Effect.gen(function* () {
              const updatedAt = yield* now;

              const rows = yield* database
                .update(userThemeTable)
                .set({ shareToken, updatedAt })
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

const decodeTheme = (theme: StoredUserTheme) =>
  Schema.decodeUnknownEffect(Schema.toType(UserThemeResponse))(theme).pipe(
    Effect.mapError((cause) => new UserThemesPersistenceError({ cause })),
  );

const currentUser = Effect.gen(function* () {
  const identity = yield* UserThemesIdentity;
  const userId = yield* identity.userId;
  const data = yield* UserThemesData;

  return { userId, data };
});

const requireTheme = Effect.fn("requireTheme")(function* (
  theme: StoredUserTheme | null,
) {
  if (theme === null) return yield* new UserThemeNotFound({ status: 404 });

  return yield* decodeTheme(theme);
});

export const getUserThemes = Effect.fn("getUserThemes")(function* () {
  const { userId, data } = yield* currentUser;
  const themes = yield* data.findMany(userId);

  return yield* Effect.forEach(themes, decodeTheme);
});

export const getUserTheme = Effect.fn("getUserTheme")(function* (
  themeId: string,
) {
  const { userId, data } = yield* currentUser;

  return yield* requireTheme(yield* data.find(userId, themeId));
});

export const createUserTheme = Effect.fn("createUserTheme")(function* (
  payload: CreateUserThemeRequest,
) {
  const { userId, data } = yield* currentUser;
  const theme = yield* data.create(userId, payload);

  if (theme === null) {
    return yield* new UserThemeLimitReached({
      status: 409,
      code: "USER_THEME_LIMIT_REACHED",
    });
  }

  return yield* decodeTheme(theme);
});

export const updateUserTheme = Effect.fn("updateUserTheme")(function* (
  themeId: string,
  payload: UpdateUserThemeRequest,
) {
  const { userId, data } = yield* currentUser;

  return yield* requireTheme(yield* data.update(userId, themeId, payload));
});

export const deleteUserTheme = Effect.fn("deleteUserTheme")(function* (
  themeId: string,
) {
  const { userId, data } = yield* currentUser;

  if (!(yield* data.delete(userId, themeId))) {
    return yield* new UserThemeNotFound({ status: 404 });
  }

  return { success: true };
});

/** 128 random bits, URL-safe: unguessable, so the link is the permission. */
const makeShareToken = () => randomBytes(16).toString("base64url");

export const shareUserTheme = Effect.fn("shareUserTheme")(function* (
  themeId: string,
) {
  const { userId, data } = yield* currentUser;
  const theme = yield* requireTheme(yield* data.find(userId, themeId));

  if (theme.shareToken !== null) return theme;

  return yield* requireTheme(
    yield* data.setShareToken(userId, themeId, makeShareToken()),
  );
});

export const unshareUserTheme = Effect.fn("unshareUserTheme")(function* (
  themeId: string,
) {
  const { userId, data } = yield* currentUser;

  return yield* requireTheme(yield* data.setShareToken(userId, themeId, null));
});

export const getSharedUserTheme = Effect.fn("getSharedUserTheme")(function* (
  shareToken: string,
) {
  const data = yield* UserThemesData;
  const theme = yield* data.findShared(shareToken);

  if (theme === null) return yield* new UserThemeNotFound({ status: 404 });

  return yield* Schema.decodeUnknownEffect(
    Schema.toType(SharedUserThemeResponse),
  )({ name: theme.name, definition: theme.definition }).pipe(
    Effect.mapError((cause) => new UserThemesPersistenceError({ cause })),
  );
});

type UserThemesHttpFailure =
  | UserThemeNotFound
  | UserThemeLimitReached
  | UserThemesPersistenceError
  | ReauthenticationRequired;

const toHttpResponse = <A, R>(
  effect: Effect.Effect<A, UserThemesHttpFailure, R>,
) =>
  Effect.catchTags(effect, {
    UserThemeNotFound: emptyStatusResponse,
    UserThemeLimitReached: statusCodeResponse,
    ReauthenticationRequired: reauthenticationRequiredResponse,
    UserThemesPersistenceError: (error) => Effect.die(error.cause),
  });

export const UserThemesHandlers = HttpApiBuilder.group(
  LootlogApi,
  "user-themes",
  (handlers) =>
    handlers
      .handle("UserThemesControllerGetThemes", () =>
        toHttpResponse(getUserThemes()),
      )
      .handle("UserThemesControllerCreateTheme", ({ payload }) =>
        toHttpResponse(createUserTheme(payload)),
      )
      .handle("UserThemesControllerGetTheme", ({ params }) =>
        toHttpResponse(getUserTheme(params.themeId)),
      )
      .handle("UserThemesControllerUpdateTheme", ({ params, payload }) =>
        toHttpResponse(updateUserTheme(params.themeId, payload)),
      )
      .handle("UserThemesControllerDeleteTheme", ({ params }) =>
        toHttpResponse(deleteUserTheme(params.themeId)),
      )
      .handle("UserThemesControllerShareTheme", ({ params }) =>
        toHttpResponse(shareUserTheme(params.themeId)),
      )
      .handle("UserThemesControllerUnshareTheme", ({ params }) =>
        toHttpResponse(unshareUserTheme(params.themeId)),
      )
      .handle("UserThemesControllerGetSharedTheme", ({ params }) =>
        toHttpResponse(getSharedUserTheme(params.shareToken)),
      ),
);
