import { BunHttpServer } from "@effect/platform-bun";
import {
  httpServerMetrics,
  httpServerRouteMetrics,
} from "@lootlog/instrumentation";
import { Layer } from "effect";
import { HttpRouter } from "effect/http";
import {
  type Rpc,
  type RpcGroup,
  RpcSerialization,
  RpcServer,
} from "effect/rpc";

export const RPC_PATH = "/rpc";

export const DEFAULT_RPC_PORT = 4001;

export const serviceRpcRoutes = <Rpcs extends Rpc.Any, E, R>(options: {
  readonly group: RpcGroup.RpcGroup<Rpcs>;
  readonly handlers: Layer.Layer<Rpc.ToHandler<Rpcs>, E, R>;
  readonly spanPrefix?: string;
}) =>
  RpcServer.layerHttp({
    group: options.group,
    path: RPC_PATH,
    protocol: "http",
    spanPrefix: options.spanPrefix,
  }).pipe(
    Layer.provide(options.handlers),
    Layer.provide(RpcSerialization.layerNdjson),
    Layer.provide(httpServerRouteMetrics),
  );

export const serviceRpcServer = <Rpcs extends Rpc.Any, E, R>(options: {
  readonly group: RpcGroup.RpcGroup<Rpcs>;
  readonly handlers: Layer.Layer<Rpc.ToHandler<Rpcs>, E, R>;
  readonly port: number;
  readonly spanPrefix?: string;
}) =>
  HttpRouter.serve(serviceRpcRoutes(options), {
    middleware: httpServerMetrics,
  }).pipe(
    Layer.provide(
      BunHttpServer.layer({ hostname: "0.0.0.0", port: options.port }),
    ),
  );
