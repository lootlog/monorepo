import { TaggedError as TaggedErrorClass } from "effect/Schema";
import { Context, Effect, Layer, Schema } from "effect";
import * as HttpServerResponse from "effect/unstable/http/HttpServerResponse";
import {
  Permission,
  type Permission as PermissionValue,
} from "@lootlog/schema/permissions";
import type { PublicGuildStatsCard } from "#src/public-guild-stats-card/public-guild-stats-card.service";
import { AuthenticatedGuildStatsCardControllerRefreshStatsCard200 } from "../../contracts/guild-stats-card/schemas.js";
import { MapsControllerGetMaps200 } from "../../contracts/maps/schemas.js";

const PUBLIC_CACHE_CONTROL = "public, max-age=300, must-revalidate";
const LOCAL_CACHE_CONTROL = "no-store";

export class PublicSystemAccessDenied extends TaggedErrorClass<PublicSystemAccessDenied>()(
  "PublicSystemAccessDenied",
  {
    status: Schema.Literals([401, 403, 404]),
    code: Schema.String,
  },
) {}

export class PublicSystemOperationError extends TaggedErrorClass<PublicSystemOperationError>()(
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
    readonly getMaps: Effect.Effect<unknown, PublicSystemOperationError>;
    readonly statsCard: PublicGuildStatsCard;
    readonly local: boolean;
  }) {
    return Layer.succeed(
      PublicSystemData,
      PublicSystemData.makeServices(options),
    );
  }

  static makeServices(options: {
    readonly getMaps: Effect.Effect<unknown, PublicSystemOperationError>;
    readonly statsCard: PublicGuildStatsCard;
    readonly local: boolean;
  }): PublicSystemData["Service"] {
    const operation = <A, E>(effect: Effect.Effect<A, E>) =>
      effect.pipe(
        Effect.mapError((cause) => new PublicSystemOperationError({ cause })),
      );

    return PublicSystemData.of({
      healthCheck: Effect.void,
      getMaps: options.getMaps,
      refreshStatsCard: (guildId) =>
        operation(options.statsCard.refreshStatsCard(guildId)),
      getStatsCard: (guildId) =>
        operation(options.statsCard.getStatsCard(guildId)),
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

export const healthCheck = Effect.fn("HealthzControllerHealthCheck")(
  function* () {
    const data = yield* PublicSystemData;
    yield* data.healthCheck;
  },
);

export const getMaps = Effect.fn("MapsControllerGetMaps")(function* () {
  const data = yield* PublicSystemData;
  return yield* decode(MapsControllerGetMaps200, yield* data.getMaps);
});

export const refreshStatsCard = Effect.fn(
  "AuthenticatedGuildStatsCardControllerRefreshStatsCard",
)(function* (guildId: string) {
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

export const getPublicStatsCard = Effect.fn(
  "PublicGuildStatsCardControllerGetStatsCard",
)(function* (guildId: string) {
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

export const toPublicSystemHttpResponse = <A, E, R>(
  effect: Effect.Effect<A, E, R>,
) => Effect.catch(effect, (error) => Effect.die(defectCause(error)));
