import {
  LootlogConfigOperationError,
  LootlogConfigData,
} from "#src/lootlog-config/lootlog-config-data";
import { AccessRequirement } from "@lootlog/domain/access-policy";
import type { Permission as PermissionValue } from "@lootlog/schema/permissions";
import {
  optionalPathString,
  statusCodeResponse,
  reauthenticationRequiredResponse,
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
import type { ReauthenticationRequired } from "#src/http-api/contracts/shared";

export class LootlogConfigAccessDenied extends TaggedErrorClass<LootlogConfigAccessDenied>()(
  "LootlogConfigAccessDenied",
  { status: Schema.Literals([401, 403, 404]), code: Schema.String },
) {}

export class LootlogConfigAuthorization extends Context.Service<
  LootlogConfigAuthorization,
  {
    readonly requireCapability: (options: {
      readonly guildId: string;
      readonly anyOf: ReadonlyArray<PermissionValue>;
    }) => Effect.Effect<
      { readonly guildId: string },
      LootlogConfigAccessDenied | ReauthenticationRequired
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

  // The open configuration fields can contain domain dates outside the declared fields.
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

    return yield* Schema.decodeUnknownEffect(NpcLootlogConfigResponse)(
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
