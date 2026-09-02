import { Context, Effect, Layer, Schema } from "effect";
import { HttpApiBuilder } from "effect/unstable/httpapi";
import * as HttpServerResponse from "effect/unstable/http/HttpServerResponse";
import {
  Permission,
  type Permission as PermissionValue,
} from "@lootlog/schema/permissions";
import type { MapsService } from "#src/maps/maps.service";
import type { PublicGuildStatsCardService } from "#src/public-guild-stats-card/public-guild-stats-card.service";
import {
  AuthenticatedGuildStatsCardControllerRefreshStatsCard200,
  LootlogApi,
  MapsControllerGetMaps200,
} from "../../lootlog-api.generated.js";

const PUBLIC_CACHE_CONTROL = "public, max-age=300, must-revalidate";
const LOCAL_CACHE_CONTROL = "no-store";

// oxlint-disable-next-line unicorn/throw-new-error -- Schema.TaggedError is a class factory.
export class PublicSystemAccessDenied extends Schema.TaggedError<PublicSystemAccessDenied>()(
  "PublicSystemAccessDenied",
  {
    status: Schema.Literals([401, 403, 404]),
    code: Schema.String,
  },
) {}

// oxlint-disable-next-line unicorn/throw-new-error -- Schema.TaggedError is a class factory.
export class PublicSystemOperationError extends Schema.TaggedError<PublicSystemOperationError>()(
  "PublicSystemOperationError",
  { cause: Schema.Defect() },
) {}

export class PublicSystemAuthorization extends Context.Service<
  PublicSystemAuthorization,
  {
    readonly requireCapability: (options: {
      readonly guildId: string;
      readonly anyOf: ReadonlyArray<PermissionValue>;
    }) => Effect.Effect<{ readonly guildId: string }, PublicSystemAccessDenied>;
  }
>()("@lootlog/api/http-api/public-system/authorization") {}

export class PublicSystemData extends Context.Service<
  PublicSystemData,
  {
    readonly healthCheck: Effect.Effect<void, PublicSystemOperationError>;
    readonly getMaps: Effect.Effect<unknown, PublicSystemOperationError>;
    readonly refreshStatsCard: (
      guildId: string,
    ) => Effect.Effect<unknown, PublicSystemOperationError>;
    readonly getStatsCard: (
      guildId: string,
    ) => Effect.Effect<Uint8Array, PublicSystemOperationError>;
    readonly statsCardCacheControl: string;
  }
>()("@lootlog/api/http-api/public-system/data") {
  static layerServices(options: {
    readonly maps: MapsService;
    readonly statsCard: PublicGuildStatsCardService;
    readonly local: boolean;
  }) {
    return Layer.succeed(
      PublicSystemData,
      PublicSystemData.makeServices(options),
    );
  }

  static makeServices(options: {
    readonly maps: MapsService;
    readonly statsCard: PublicGuildStatsCardService;
    readonly local: boolean;
  }): PublicSystemData["Service"] {
    const attempt = <A>(operation: () => A | PromiseLike<A>) =>
      Effect.tryPromise({
        try: () => Promise.resolve(operation()),
        catch: (cause) => new PublicSystemOperationError({ cause }),
      });

    return PublicSystemData.of({
      healthCheck: Effect.void,
      getMaps: attempt(() => options.maps.getMaps()),
      refreshStatsCard: (guildId) =>
        attempt(() => options.statsCard.refreshStatsCard(guildId)),
      getStatsCard: (guildId) =>
        attempt(() => options.statsCard.getStatsCard(guildId)),
      statsCardCacheControl: options.local
        ? LOCAL_CACHE_CONTROL
        : PUBLIC_CACHE_CONTROL,
    });
  }
}

const decode = <A, I, R>(schema: Schema.Codec<A, I, R>, value: unknown) =>
  Schema.decodeUnknownEffect(schema)(value).pipe(
    Effect.mapError((cause) => new PublicSystemOperationError({ cause })),
  );

export const healthCheck = Effect.fn("healthCheck")(function* () {
  const data = yield* PublicSystemData;
  yield* data.healthCheck;
});

export const getMaps = Effect.fn("getMaps")(function* () {
  const data = yield* PublicSystemData;
  return yield* decode(MapsControllerGetMaps200, yield* data.getMaps);
});

export const refreshStatsCard = Effect.fn("refreshStatsCard")(function* (
  guildId: string,
) {
  const authorization = yield* PublicSystemAuthorization;
  const access = yield* authorization.requireCapability({
    guildId,
    anyOf: [Permission.OWNER, Permission.ADMIN],
  });

  const data = yield* PublicSystemData;
  return yield* decode(
    AuthenticatedGuildStatsCardControllerRefreshStatsCard200,
    yield* data.refreshStatsCard(access.guildId),
  );
});

export const getPublicStatsCard = Effect.fn("getPublicStatsCard")(function* (
  guildId: string,
) {
  const data = yield* PublicSystemData;
  const image = yield* data.getStatsCard(guildId);

  return HttpServerResponse.uint8Array(image, {
    status: 200,
    contentType: "image/png",
    headers: { "Cache-Control": data.statsCardCacheControl },
  });
});

const defectCause = (error: unknown) =>
  error instanceof PublicSystemOperationError ? error.cause : error;

const orDieHttpFailure = <A, E, R>(effect: Effect.Effect<A, E, R>) =>
  Effect.catch(effect, (error) => Effect.die(defectCause(error)));

export const HealthHandlers = HttpApiBuilder.group(
  LootlogApi,
  "health",
  (handlers) =>
    handlers.handle("HealthzControllerHealthCheck", () =>
      orDieHttpFailure(healthCheck()),
    ),
);

export const MapsHandlers = HttpApiBuilder.group(
  LootlogApi,
  "maps",
  (handlers) =>
    handlers.handle("MapsControllerGetMaps", () => orDieHttpFailure(getMaps())),
);

export const GuildStatsCardHandlers = HttpApiBuilder.group(
  LootlogApi,
  "guild-stats-card",
  (handlers) =>
    handlers.handle(
      "AuthenticatedGuildStatsCardControllerRefreshStatsCard",
      ({ params }) => orDieHttpFailure(refreshStatsCard(params.guildId)),
    ),
);

export const PublicGuildStatsCardHandlers = HttpApiBuilder.group(
  LootlogApi,
  "public-guild-stats-card",
  (handlers) =>
    handlers.handleRaw(
      "PublicGuildStatsCardControllerGetStatsCard",
      ({ params }) => orDieHttpFailure(getPublicStatsCard(params.guildId)),
    ),
);
