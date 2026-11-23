import { Schema } from "effect";
import { Rpc, RpcGroup } from "effect/rpc";
import { CallerAuth, RpcCallers } from "./callers.js";
import {
  RpcForbiddenError,
  RpcUnauthorizedError,
  RpcUnavailableError,
} from "./errors.js";

export const GatewayPresenceCharacter = Schema.Struct({
  world: Schema.String,
  name: Schema.String,
});

export const GatewayPresenceEntry = Schema.Struct({
  platform: Schema.String,
  status: Schema.String,
  isAfk: Schema.Boolean,
  character: Schema.optionalKey(GatewayPresenceCharacter),
});

export const GatewayPresenceSnapshot = Schema.Struct({
  presences: Schema.Array(GatewayPresenceEntry),
});

export type GatewayPresenceSnapshot = typeof GatewayPresenceSnapshot.Type;

export class GatewayRpcGroup extends RpcGroup.make(
  Rpc.make("getOrganizationPresence", {
    payload: {
      userId: Schema.String,
      discordId: Schema.String,
      organizationId: Schema.String,
    },
    success: GatewayPresenceSnapshot,
    error: Schema.Union([
      RpcUnauthorizedError,
      RpcForbiddenError,
      RpcUnavailableError,
    ]),
  }).annotate(RpcCallers, ["discord-bot"]),
).middleware(CallerAuth) {}
