import { Schema } from "effect";
import { Rpc, RpcGroup } from "effect/rpc";
import { CallerAuth, RpcCallers } from "./callers.js";
import { RpcUnavailableError } from "./errors.js";

export const CatalogItemSearchHit = Schema.Struct({
  name: Schema.String,
  lvl: Schema.Finite,
  rarity: Schema.NullOr(Schema.String),
});

export const CatalogItemSearchResult = Schema.Struct({
  hits: Schema.Array(CatalogItemSearchHit),
});

export type CatalogItemSearchResult = typeof CatalogItemSearchResult.Type;

export class CatalogRpcGroup extends RpcGroup.make(
  Rpc.make("searchItems", {
    payload: {
      search: Schema.String,
      limit: Schema.Finite,
    },
    success: CatalogItemSearchResult,
    error: RpcUnavailableError,
  }).annotate(RpcCallers, ["discord-bot"]),
).middleware(CallerAuth) {}
