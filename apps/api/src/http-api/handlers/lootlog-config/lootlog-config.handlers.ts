import type { ForwardAuthIdentity } from "#src/runtime/auth/forward-auth-identity";
import {
  type ReauthenticationRequired,
  reauthenticationRequiredResponse,
} from "@lootlog/protocol/http/errors";
import {
  LootlogConfigOperationError,
  LootlogConfigData,
} from "#src/lootlog-config/lootlog-config-data";
import { AccessRequirement } from "@lootlog/domain/access-policy";
import type { Permission as PermissionValue } from "@lootlog/schema/permissions";
import {
  optionalPathString,
  statusCodeResponse,
} from "#src/shared/http/handler-response";
import { applicationErrorResponse } from "../../application-error-response.js";
import { TaggedError as TaggedErrorClass } from "effect/Schema";
import { Context, Effect, Schema } from "effect";

import { HttpApiBuilder } from "effect/http-api";
import { decodeDomainJson } from "../../domain-json.schema.js";

import { LootlogApi } from "../../lootlog-api.js";
import {
  LootlogConfigResponse,
  NpcLootlogConfigResponse,
  type UpdateNpcLootlogConfigRequest,
} from "#src/contracts/lootlog-config/schemas";

export class LootlogConfigAccessDenied extends TaggedErrorClass<
  LootlogConfigAccessDenied,
  { readonly brand: unique symbol }
>()("LootlogConfigAccessDenied", {
  status: Schema.Literals([401, 403, 404]),
  code: Schema.String,
}) {}

export class LootlogConfigAuthorization extends Context.Service<
  LootlogConfigAuthorization,
  {
    readonly requireCapability: (options: {
      readonly guildId: string;
      readonly anyOf: ReadonlyArray<PermissionValue>;
    }) => Effect.Effect<
      { readonly guildId: string },
      LootlogConfigAccessDenied | ReauthenticationRequired,
      ForwardAuthIdentity
    >;
  }
>()("@lootlog/api/http-api/lootlog-config/authorization") {}

const authorize = (guildId: string | undefined) => {
  if (typeof guildId !== "string") {
    return Effect.fail(
      new LootlogConfigAccessDenied({
        status: 404,
        code: "GUILD_NOT_FOUND",
      }),
    );
  }

  return Effect.flatMap(LootlogConfigAuthorization, (authorization) =>
    authorization.requireCapability({
      guildId,
      anyOf: AccessRequirement.ADMINISTER,
    }),
  );
};

export const getLootlogConfig = Effect.fn("getLootlogConfig")(function* (
  requestedGuildId: string | undefined,
) {
  const { guildId } = yield* authorize(requestedGuildId);
  const data = yield* LootlogConfigData;

  return yield* decodeDomainJson(
    LootlogConfigResponse,
    yield* data.get(guildId),
  ).pipe(
    Effect.mapError((cause) => new LootlogConfigOperationError({ cause })),
  );
});

export const updateLootlogConfigNpc = Effect.fn("updateLootlogConfigNpc")(
  function* (
    requestedGuildId: string | undefined,
    npcId: number,
    payload: UpdateNpcLootlogConfigRequest,
  ) {
    const { guildId } = yield* authorize(requestedGuildId);
    const data = yield* LootlogConfigData;

    return yield* Schema.decodeEffect(NpcLootlogConfigResponse)(
      yield* data.updateNpc(guildId, npcId, payload),
    ).pipe(
      Effect.mapError((cause) => new LootlogConfigOperationError({ cause })),
    );
  },
);

type LootlogConfigHttpFailure =
  | LootlogConfigAccessDenied
  | LootlogConfigOperationError
  | ReauthenticationRequired;

const orDieHttpFailure = <A, R>(
  effect: Effect.Effect<A, LootlogConfigHttpFailure, R>,
) =>
  Effect.catchTags(effect, {
    LootlogConfigAccessDenied: statusCodeResponse,
    ReauthenticationRequired: reauthenticationRequiredResponse,
    LootlogConfigOperationError: (error) =>
      applicationErrorResponse(error.cause),
  });

export const LootlogConfigHandlers = HttpApiBuilder.group(
  LootlogApi,
  "lootlog-config",
  (handlers) =>
    handlers
      .handle("LootlogConfigControllerGetLootlogConfig", ({ params }) =>
        orDieHttpFailure(getLootlogConfig(optionalPathString(params.guildId))),
      )
      .handle("LootlogConfigControllerUpdateNpc", ({ params, payload }) =>
        orDieHttpFailure(
          updateLootlogConfigNpc(
            optionalPathString(params.guildId),
            params.npcId,
            payload,
          ),
        ),
      ),
);
