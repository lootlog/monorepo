import type { ForwardAuthIdentity } from "#src/runtime/auth/forward-auth-identity";
import {
  UserLootlogConfigOperationError,
  UserLootlogConfigData,
} from "#src/lootlog-config/user-lootlog-config-data";

import { statusCodeResponse } from "#src/shared/http/handler-response";

import { TaggedError as TaggedErrorClass } from "effect/Schema";
import { Context, Effect, Schema } from "effect";

import { HttpApiBuilder } from "effect/http-api";

import { LootlogApi } from "../../lootlog-api.js";
import {
  CharacterLootlogConfigResponse,
  PlayersCatchingOrganizationsResponse,
  AccountLootlogConfigResponse,
  type UpdateCharacterLootlogConfigRequest,
  type PlayersCatchingOrganizationsRequest,
} from "#src/contracts/user-lootlog-config/schemas";

export class UserLootlogConfigAccessDenied extends TaggedErrorClass<
  UserLootlogConfigAccessDenied,
  { readonly brand: unique symbol }
>()("UserLootlogConfigAccessDenied", {
  status: Schema.Literal(401),
  code: Schema.String,
}) {}

export class UserLootlogConfigIdentity extends Context.Service<
  UserLootlogConfigIdentity,
  {
    readonly discordId: Effect.Effect<
      string,
      UserLootlogConfigAccessDenied,
      ForwardAuthIdentity
    >;
  }
>()("@lootlog/api/http-api/user-lootlog-config/identity") {}

const decode = <A, I, R>(schema: Schema.Codec<A, I, R>, value: unknown) =>
  Schema.decodeUnknownEffect(schema)(value).pipe(
    Effect.mapError((cause) => new UserLootlogConfigOperationError({ cause })),
  );

const withIdentity = <A>(
  operation: (
    discordId: string,
    data: UserLootlogConfigData["Service"],
  ) => Effect.Effect<A, UserLootlogConfigOperationError>,
) =>
  Effect.gen(function* () {
    const identity = yield* UserLootlogConfigIdentity;
    const discordId = yield* identity.discordId;
    const data = yield* UserLootlogConfigData;

    return yield* operation(discordId, data);
  });

export const getUserLootlogAccountConfig = (accountId: string) =>
  withIdentity((discordId, data) =>
    Effect.flatMap(data.getAccount(discordId, accountId), (value) =>
      decode(AccountLootlogConfigResponse, value),
    ),
  ).pipe(
    Effect.withSpan(
      "UserLootlogConfigControllerGetUserLootlogConfigByAccountId",
      {
        attributes: {
          operationId:
            "UserLootlogConfigControllerGetUserLootlogConfigByAccountId",
        },
      },
    ),
  );

export const upsertUserLootlogCharacterConfig = (
  accountId: string,
  payload: UpdateCharacterLootlogConfigRequest,
) =>
  withIdentity((discordId, data) =>
    Effect.flatMap(
      data.upsertCharacter(discordId, accountId, payload),
      (value) => decode(CharacterLootlogConfigResponse, value),
    ),
  ).pipe(
    Effect.withSpan(
      "UserLootlogConfigControllerCreateOrUpdateLootlogCharacterConfig",
      {
        attributes: {
          operationId:
            "UserLootlogConfigControllerCreateOrUpdateLootlogCharacterConfig",
        },
      },
    ),
  );

export const getPlayersCatchingGuilds = (
  payload: PlayersCatchingOrganizationsRequest,
) =>
  withIdentity((discordId, data) =>
    Effect.flatMap(data.getPlayersCatchingGuilds(discordId, payload), (value) =>
      decode(PlayersCatchingOrganizationsResponse, value),
    ),
  ).pipe(
    Effect.withSpan("UserLootlogConfigControllerGetPlayersCatchingGuilds", {
      attributes: {
        operationId: "UserLootlogConfigControllerGetPlayersCatchingGuilds",
      },
    }),
  );

type UserLootlogConfigHttpFailure =
  | UserLootlogConfigAccessDenied
  | UserLootlogConfigOperationError;

const orDieHttpFailure = <A, R>(
  effect: Effect.Effect<A, UserLootlogConfigHttpFailure, R>,
) =>
  Effect.catchTags(effect, {
    UserLootlogConfigAccessDenied: statusCodeResponse,
    UserLootlogConfigOperationError: (error) => Effect.die(error.cause),
  });

export const UserLootlogConfigHandlers = HttpApiBuilder.group(
  LootlogApi,
  "user-lootlog-config",
  (handlers) =>
    handlers
      .handle(
        "UserLootlogConfigControllerGetUserLootlogConfigByAccountId",
        ({ params }) =>
          orDieHttpFailure(getUserLootlogAccountConfig(params.accountId)),
      )
      .handle(
        "UserLootlogConfigControllerCreateOrUpdateLootlogCharacterConfig",
        ({ params, payload }) =>
          orDieHttpFailure(
            upsertUserLootlogCharacterConfig(params.accountId, payload),
          ),
      )
      .handle(
        "UserLootlogConfigControllerGetPlayersCatchingGuilds",
        ({ payload }) => orDieHttpFailure(getPlayersCatchingGuilds(payload)),
      ),
);
