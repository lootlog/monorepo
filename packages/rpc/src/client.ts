import { Effect, Layer, type Scope } from "effect";
import type { HttpClient } from "effect/http";
import {
  type Rpc,
  RpcClient,
  type RpcClientError,
  type RpcGroup,
  RpcSerialization,
} from "effect/rpc";
import { RPC_PATH } from "./server.js";

export const rpcEndpointUrl = (baseUrl: string | URL): string => {
  const normalized = String(baseUrl).replace(/\/+$/u, "");

  return normalized.endsWith(RPC_PATH)
    ? normalized
    : `${normalized}${RPC_PATH}`;
};

export const makeRpcClient = <Rpcs extends Rpc.Any>(
  group: RpcGroup.RpcGroup<Rpcs>,
  options: {
    readonly url: string | URL;
    readonly spanPrefix?: string;
  },
): Effect.Effect<
  RpcClient.RpcClient<Rpcs, RpcClientError.RpcClientError>,
  never,
  HttpClient.HttpClient | Scope.Scope
> =>
  RpcClient.make(group, { spanPrefix: options.spanPrefix }).pipe(
    Effect.provide(
      RpcClient.layerProtocolHttp({
        url: rpcEndpointUrl(options.url),
      }).pipe(Layer.provide(RpcSerialization.layerNdjson)),
    ),
  );
