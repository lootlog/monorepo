import {
  type ReauthenticationRequired,
  reauthenticationRequiredResponse,
} from "@lootlog/protocol/http/errors";
import {
  type StoredUserTheme,
  UserThemeNotFound,
  UserThemeLimitReached,
  UserThemesPersistenceError,
  UserThemesData,
} from "#src/users/user-themes-data";
import { statusCodeResponse } from "#src/shared/http/handler-response";

import { randomBytes } from "node:crypto";
import { Context, Effect, Schema } from "effect";
import { HttpApiBuilder } from "effect/http-api";

import { LootlogApi } from "../../lootlog-api.js";
import {
  SharedUserThemeResponse,
  UserThemeResponse,
  type CreateUserThemeRequest,
  type UpdateUserThemeRequest,
} from "#src/contracts/user-themes/schemas";

export class UserThemesIdentity extends Context.Service<
  UserThemesIdentity,
  { readonly userId: Effect.Effect<string> }
>()("@lootlog/api/http-api/user-themes/identity") {}

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

  return yield* requireTheme(
    yield* data.claimShareToken(userId, themeId, makeShareToken()),
  );
});

export const unshareUserTheme = Effect.fn("unshareUserTheme")(function* (
  themeId: string,
) {
  const { userId, data } = yield* currentUser;

  return yield* requireTheme(yield* data.clearShareToken(userId, themeId));
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
    UserThemeNotFound: statusCodeResponse,
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
