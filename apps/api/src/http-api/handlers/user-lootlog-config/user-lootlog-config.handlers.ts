import { Context, Effect, Layer, Schema } from "effect";
import { HttpApiBuilder } from "effect/unstable/httpapi";
import type { UserLootlogConfigService } from "#src/user-lootlog-config/user-lootlog-config.service";
import {
  LootlogApi,
  UserLootlogConfigControllerCreateOrUpdateLootlogCharacterConfig200,
  UserLootlogConfigControllerGetPlayersCatchingGuilds200,
  UserLootlogConfigControllerGetUserLootlogConfigByAccountId200,
  type CreateOrUpdateLootlogCharacterConfigDto,
  type UserLootlogPlayersCatchingGuildsRequestDto,
} from "../../lootlog-api.generated.js";

// oxlint-disable-next-line unicorn/throw-new-error -- Schema.TaggedError is a class factory.
export class UserLootlogConfigAccessDenied extends Schema.TaggedError<UserLootlogConfigAccessDenied>()(
  "UserLootlogConfigAccessDenied",
  { status: Schema.Literal(401), code: Schema.String },
) {}

// oxlint-disable-next-line unicorn/throw-new-error -- Schema.TaggedError is a class factory.
export class UserLootlogConfigOperationError extends Schema.TaggedError<UserLootlogConfigOperationError>()(
  "UserLootlogConfigOperationError",
  { cause: Schema.Defect() },
) {}

export class UserLootlogConfigIdentity extends Context.Service<
  UserLootlogConfigIdentity,
  { readonly discordId: Effect.Effect<string, UserLootlogConfigAccessDenied> }
>()("@lootlog/api/http-api/user-lootlog-config/identity") {}

type Operation = Effect.Effect<unknown, UserLootlogConfigOperationError>;

export class UserLootlogConfigData extends Context.Service<
  UserLootlogConfigData,
  {
    readonly getAccount: (discordId: string, accountId: string) => Operation;
    readonly upsertCharacter: (
      discordId: string,
      accountId: string,
      payload: CreateOrUpdateLootlogCharacterConfigDto,
    ) => Operation;
    readonly getPlayersCatchingGuilds: (
      discordId: string,
      payload: UserLootlogPlayersCatchingGuildsRequestDto,
    ) => Operation;
  }
>()("@lootlog/api/http-api/user-lootlog-config/data") {
  static layerService(service: UserLootlogConfigService) {
    return Layer.succeed(
      UserLootlogConfigData,
      UserLootlogConfigData.makeService(service),
    );
  }

  static makeService(
    service: UserLootlogConfigService,
  ): UserLootlogConfigData["Service"] {
    const attempt = (operation: () => unknown | PromiseLike<unknown>) =>
      Effect.tryPromise({
        try: () => Promise.resolve(operation()),
        catch: (cause) => new UserLootlogConfigOperationError({ cause }),
      });
    const mutable = <A>(value: unknown): A =>
      JSON.parse(JSON.stringify(value)) as A;

    return UserLootlogConfigData.of({
      getAccount: (discordId, accountId) =>
        attempt(() => service.getLootlogAccountConfig(discordId, accountId)),
      upsertCharacter: (discordId, accountId, payload) =>
        attempt(() =>
          service.createOrUpdateLootlogCharacterConfig(
            discordId,
            accountId,
            mutable(payload),
          ),
        ),
      getPlayersCatchingGuilds: (discordId, payload) =>
        attempt(() =>
          service.getPlayersCatchingGuilds(discordId, mutable(payload)),
        ),
    });
  }
}

const decode = <A, I, R>(schema: Schema.Codec<A, I, R>, value: unknown) =>
  Schema.decodeUnknownEffect(schema)(JSON.parse(JSON.stringify(value))).pipe(
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
      decode(
        UserLootlogConfigControllerGetUserLootlogConfigByAccountId200,
        value,
      ),
    ),
  );

export const upsertUserLootlogCharacterConfig = (
  accountId: string,
  payload: CreateOrUpdateLootlogCharacterConfigDto,
) =>
  withIdentity((discordId, data) =>
    Effect.flatMap(
      data.upsertCharacter(discordId, accountId, payload),
      (value) =>
        decode(
          UserLootlogConfigControllerCreateOrUpdateLootlogCharacterConfig200,
          value,
        ),
    ),
  );

export const getPlayersCatchingGuilds = (
  payload: UserLootlogPlayersCatchingGuildsRequestDto,
) =>
  withIdentity((discordId, data) =>
    Effect.flatMap(data.getPlayersCatchingGuilds(discordId, payload), (value) =>
      decode(UserLootlogConfigControllerGetPlayersCatchingGuilds200, value),
    ),
  );

const defectCause = (error: unknown) =>
  error instanceof UserLootlogConfigOperationError ? error.cause : error;
const orDieHttpFailure = <A, E, R>(effect: Effect.Effect<A, E, R>) =>
  Effect.catch(effect, (error) => Effect.die(defectCause(error)));

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
