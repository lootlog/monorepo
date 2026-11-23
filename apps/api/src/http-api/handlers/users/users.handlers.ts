import { CUSTOM_THEME_PREFERENCE_PREFIX } from "@lootlog/schema/custom-theme";
import {
  AccountDeletionAccepted,
  UserPreferencesResponse,
  CurrentOrganizationsResponse,
  type UpdateUserPreferencesRequest,
} from "#src/contracts/users/schemas";
import {
  AccountOrganizationNotFound,
  data,
  decode,
  identity,
  toAccountOrganizationHttpResponse,
} from "../../access/account-organization.access.js";
import type { UserFeedQuery } from "#src/contracts/users/feed-schemas";
import { Effect } from "effect";
import {
  requireCaller,
  data as recordsData,
  toRecordsHttpResponse,
} from "../../access/records.access.js";
import { HttpApiBuilder } from "effect/http-api";
import { LootlogApi } from "../../lootlog-api.js";
import { getGameClientBootstrap } from "./game-client-bootstrap.operations.js";

const deleteCurrentAccount = Effect.fn("deleteCurrentAccount")(function* () {
  const current = yield* identity;
  yield* data((service) => service.deleteAccount(current));

  return yield* decode(AccountDeletionAccepted, { status: "ACCEPTED" });
});

export const getCurrentUserPreferences = Effect.fn("getCurrentUserPreferences")(
  function* () {
    const current = yield* identity;

    const value = yield* data((service) =>
      service.getUserPreferences(current.userId),
    );

    return yield* decode(UserPreferencesResponse, value);
  },
);

export const updateCurrentUserPreferences = Effect.fn(
  "updateCurrentUserPreferences",
)(function* (payload: UpdateUserPreferencesRequest) {
  const current = yield* identity;

  if (payload.theme?.startsWith(CUSTOM_THEME_PREFERENCE_PREFIX)) {
    const themeId = payload.theme.slice(CUSTOM_THEME_PREFERENCE_PREFIX.length);

    const owned = yield* data((service) =>
      service.userOwnsTheme(current.userId, themeId),
    );

    if (!owned) {
      return yield* new AccountOrganizationNotFound({
        status: 404,
        code: "USER_THEME_NOT_FOUND",
      });
    }
  }

  const value = yield* data((service) =>
    service.updateUserPreferences(current.userId, payload),
  );

  return yield* decode(UserPreferencesResponse, value);
});

const getCurrentUserLimits = Effect.fn("getCurrentUserLimits")(function* () {
  const current = yield* identity;

  return yield* data((service) => service.getUserLimits(current.userId));
});

const getCurrentUserGuilds = Effect.fn("getCurrentUserGuilds")(function* (
  refresh: boolean,
) {
  const current = yield* identity;

  const value = yield* data((service) =>
    service.getCurrentUserGuilds(current, refresh),
  );

  return yield* decode(CurrentOrganizationsResponse, value);
});

export const getCurrentUserAccessibleGuilds = Effect.fn(
  "getCurrentUserAccessibleGuilds",
)(function* () {
  const current = yield* identity;

  const value = yield* data((service) =>
    service.getCurrentUserAccessibleGuilds(current),
  );

  return yield* decode(CurrentOrganizationsResponse, value);
});

const deleteCurrentAccountHttpResponse = () =>
  toAccountOrganizationHttpResponse(deleteCurrentAccount());

export const getUserFeed = Effect.fn("users.feed")(function* (
  query: UserFeedQuery,
) {
  const caller = yield* requireCaller;

  return yield* recordsData((service) => service.getUserFeed(caller, query));
});

export const UsersHandlers = HttpApiBuilder.group(
  LootlogApi,
  "users",
  (handlers) =>
    handlers
      .handle("UsersControllerGetUserFeed", ({ query }) =>
        toRecordsHttpResponse(getUserFeed(query)),
      )
      .handle("UsersControllerDeleteAccount", deleteCurrentAccountHttpResponse)
      .handle("UsersControllerGetUserPreferences", () =>
        toAccountOrganizationHttpResponse(getCurrentUserPreferences()),
      )
      .handle("UsersControllerUpdateUserPreferences", ({ payload }) =>
        toAccountOrganizationHttpResponse(
          updateCurrentUserPreferences(payload),
        ),
      )
      .handle("UsersControllerGetUserLimits", () =>
        toAccountOrganizationHttpResponse(getCurrentUserLimits()),
      )
      .handle("UsersControllerGetCurrentUserGuilds", () =>
        toAccountOrganizationHttpResponse(getCurrentUserGuilds(false)),
      )
      .handle("UsersControllerRefreshCurrentUserGuilds", () =>
        toAccountOrganizationHttpResponse(getCurrentUserGuilds(true)),
      )
      .handle("UsersControllerGetCurrentUserAccessibleGuilds", () =>
        toAccountOrganizationHttpResponse(getCurrentUserAccessibleGuilds()),
      )
      .handle("UsersControllerGetGameClientBootstrap", ({ query }) =>
        getGameClientBootstrap(query),
      ),
);
