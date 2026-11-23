import { jitteredRetryDelay } from "@lootlog/instrumentation/retry-delay";
import { type Duration, Effect, Layer, Predicate, Schedule } from "effect";
import {
  type Rpc,
  RpcClient,
  type RpcClientError,
  type RpcGroup,
  RpcSerialization,
} from "effect/rpc";
import { callerAuthClient, type RpcUpstream } from "./callers.js";
import { RPC_PATH } from "./server.js";

export type ServiceRpcClient<Group> =
  Group extends RpcGroup.RpcGroup<infer Rpcs>
    ? {
        readonly [Current in Rpcs as Current["_tag"]]: (
          payload: Rpc.PayloadConstructor<Current>,
        ) => Effect.Effect<
          Rpc.Success<Current>,
          Rpc.Error<Current> | RpcClientError.RpcClientError
        >;
      }
    : never;

const rpcEndpointUrl = (baseUrl: string): string =>
  `${baseUrl.replace(/\/+$/u, "")}${RPC_PATH}`;

export const makeRpcClient = <Rpcs extends Rpc.Any>(
  group: RpcGroup.RpcGroup<Rpcs>,
  options: RpcUpstream & { readonly spanPrefix: string },
) =>
  RpcClient.make(group, { spanPrefix: options.spanPrefix }).pipe(
    Effect.provide(
      Layer.merge(
        RpcClient.layerProtocolHttp({
          url: rpcEndpointUrl(options.url),
        }).pipe(Layer.provide(RpcSerialization.layerNdjson)),
        callerAuthClient(options.token),
      ),
    ),
  );

const isTransientRpcFailure = Predicate.or(
  Predicate.isTagged("RpcClientError"),
  Predicate.or(
    Predicate.isTagged("RpcUnavailableError"),
    Predicate.isTagged("TimeoutError"),
  ),
);

export const boundedRpcCall =
  (options: { readonly timeout: Duration.Input; readonly retries: number }) =>
  <A, E, R>(call: () => Effect.Effect<A, E, R>) =>
    Effect.suspend(call).pipe(
      Effect.timeout(options.timeout),
      Effect.retry({
        schedule: Schedule.max([
          jitteredRetryDelay,
          Schedule.recurs(options.retries),
        ]),
        while: isTransientRpcFailure,
      }),
    );
