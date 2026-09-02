import { Context, Effect, Layer, Schema } from "effect";
import { HttpApiBuilder } from "effect/unstable/httpapi";
import type { GuildsService } from "#src/guilds/guilds.service";
import {
  GuildsInternalControllerGetGuildByIdOrVanityUrl200,
  GuildsInternalControllerGetUserPermissions200,
  LootlogApi,
} from "../../lootlog-api.generated.js";

// oxlint-disable-next-line unicorn/throw-new-error -- Schema.TaggedError is a class factory.
export class InternalGuildsOperationError extends Schema.TaggedError<InternalGuildsOperationError>()(
  "InternalGuildsOperationError",
  { cause: Schema.Defect() },
) {}

export class InternalGuildsData extends Context.Service<
  InternalGuildsData,
  {
    readonly getUserPermissions: (
      discordId: string,
      userId: string,
    ) => Effect.Effect<unknown, InternalGuildsOperationError>;
    readonly getGuild: (
      idOrVanityUrl: string,
    ) => Effect.Effect<unknown, InternalGuildsOperationError>;
  }
>()("@lootlog/api/http-api/internal-guilds/data") {
  static layerService(service: GuildsService) {
    const attempt = (operation: () => unknown | PromiseLike<unknown>) =>
      Effect.tryPromise({
        try: () => Promise.resolve(operation()),
        catch: (cause) => new InternalGuildsOperationError({ cause }),
      });
    return Layer.succeed(
      InternalGuildsData,
      InternalGuildsData.of({
        getUserPermissions: (discordId, userId) =>
          attempt(() =>
            service.getUserGuildsWithPermissions(discordId, userId),
          ),
        getGuild: (idOrVanityUrl) =>
          attempt(() => service.getGuildById(idOrVanityUrl)),
      }),
    );
  }
}

const decode = <A, I, R>(schema: Schema.Codec<A, I, R>, value: unknown) =>
  Schema.decodeUnknownEffect(schema)(JSON.parse(JSON.stringify(value))).pipe(
    Effect.mapError((cause) => new InternalGuildsOperationError({ cause })),
  );

export const getInternalUserPermissions = (discordId: string, userId: string) =>
  Effect.gen(function* () {
    if (discordId.length === 0 || userId.length === 0) return [];
    const data = yield* InternalGuildsData;
    return yield* Effect.flatMap(
      data.getUserPermissions(discordId, userId),
      (value) => decode(GuildsInternalControllerGetUserPermissions200, value),
    );
  });

export const getInternalGuild = (idOrVanityUrl: string) =>
  Effect.gen(function* () {
    const data = yield* InternalGuildsData;
    return yield* Effect.flatMap(data.getGuild(idOrVanityUrl), (value) =>
      decode(GuildsInternalControllerGetGuildByIdOrVanityUrl200, value),
    );
  });

const orDieHttpFailure = <A, E, R>(effect: Effect.Effect<A, E, R>) =>
  Effect.catch(effect, (error) =>
    Effect.die(
      error instanceof InternalGuildsOperationError ? error.cause : error,
    ),
  );

export const InternalGuildsHandlers = HttpApiBuilder.group(
  LootlogApi,
  "internal",
  (handlers) =>
    handlers
      .handle("GuildsInternalControllerGetUserPermissions", ({ query }) =>
        orDieHttpFailure(
          getInternalUserPermissions(query.discordId, query.userId),
        ),
      )
      .handle("GuildsInternalControllerGetGuildByIdOrVanityUrl", ({ params }) =>
        orDieHttpFailure(getInternalGuild(params.idOrVanityUrl)),
      ),
);
