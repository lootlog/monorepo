import type { ForwardAuthIdentity } from "#src/runtime/auth/forward-auth-identity";
import {
  type ReauthenticationRequired,
  reauthenticationRequiredResponse,
} from "@lootlog/protocol/http/errors";
import { statusCodeResponse } from "#src/shared/http/handler-response";
import { TaggedError as TaggedErrorClass } from "effect/Schema";
import { Context, Effect, Layer, Schema } from "effect";
import type { Capability as PermissionValue } from "@lootlog/schema/permissions";
import type { PublicGuildStatsCard } from "#src/public-guild-stats-card/public-guild-stats-card.service";

import type { RefreshStatsCardResponse } from "#src/contracts/guild-stats-card/schemas";
import type { GameMapsResponse } from "#src/contracts/maps/schemas";

const PUBLIC_CACHE_CONTROL = "public, max-age=300, must-revalidate";

const LOCAL_CACHE_CONTROL = "no-store";

export class PublicSystemAccessDenied extends TaggedErrorClass<
  PublicSystemAccessDenied,
  { readonly brand: unique symbol }
>()("PublicSystemAccessDenied", {
  status: Schema.Literals([401, 403, 404]),
  code: Schema.String,
}) {}

export class PublicSystemOperationError extends TaggedErrorClass<
  PublicSystemOperationError,
  { readonly brand: unique symbol }
>()("PublicSystemOperationError", { cause: Schema.Defect() }) {}

export class PublicSystemAuthorization extends Context.Service<
  PublicSystemAuthorization,
  {
    readonly requireCapability: (options: {
      readonly guildId: string;
      readonly anyOf: ReadonlyArray<PermissionValue>;
    }) => Effect.Effect<
      { readonly guildId: string },
      PublicSystemAccessDenied | ReauthenticationRequired,
      ForwardAuthIdentity
    >;
  }
>()("@lootlog/api/http-api/public-system/authorization") {}

export class PublicSystemData extends Context.Service<
  PublicSystemData,
  {
    readonly healthCheck: Effect.Effect<void, PublicSystemOperationError>;
    readonly getMaps: Effect.Effect<
      GameMapsResponse,
      PublicSystemOperationError
    >;
    readonly refreshStatsCard: (
      guildId: string,
    ) => Effect.Effect<RefreshStatsCardResponse, PublicSystemOperationError>;
    readonly getStatsCard: (
      guildId: string,
    ) => Effect.Effect<Uint8Array, PublicSystemOperationError>;
    readonly statsCardCacheControl: string;
  }
>()("@lootlog/api/http-api/public-system/data") {
  static layerServices(options: {
    readonly getMaps: Effect.Effect<
      GameMapsResponse,
      PublicSystemOperationError
    >;
    readonly statsCard: PublicGuildStatsCard;
    readonly local: boolean;
  }) {
    return Layer.succeed(
      PublicSystemData,
      PublicSystemData.makeServices(options),
    );
  }

  static makeServices(options: {
    readonly getMaps: Effect.Effect<
      GameMapsResponse,
      PublicSystemOperationError
    >;
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

export const decode = <A, I, R>(
  schema: Schema.Codec<A, I, R>,
  value: unknown,
) =>
  Schema.decodeUnknownEffect(schema)(value).pipe(
    Effect.mapError((cause) => new PublicSystemOperationError({ cause })),
  );

export const toPublicSystemHttpResponse = <A, R>(
  effect: Effect.Effect<
    A,
    | PublicSystemAccessDenied
    | PublicSystemOperationError
    | ReauthenticationRequired,
    R
  >,
) =>
  Effect.catchTags(effect, {
    PublicSystemAccessDenied: statusCodeResponse,
    ReauthenticationRequired: reauthenticationRequiredResponse,
    PublicSystemOperationError: (error) => Effect.die(error.cause),
  });
