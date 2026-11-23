import { BunHttpServer } from "@effect/platform-bun";
import {
  httpServerMetrics,
  httpServerRouteMetrics,
} from "@lootlog/instrumentation";
import { Config, Layer, Option } from "effect";
import { HttpRouter } from "effect/http";
import {
  type Rpc,
  type RpcGroup,
  RpcSerialization,
  RpcServer,
} from "effect/rpc";
import { callerAuthServer, type CallerTokens } from "./callers.js";

export const RPC_PATH = "/rpc";

const RPC_PORT_OFFSET = 100;

export const rpcPortConfig = Config.all({
  rpcPort: Config.option(Config.Port("RPC_PORT")),
  port: Config.Port("PORT"),
}).pipe(
  Config.map(({ rpcPort, port }) =>
    Option.getOrElse(rpcPort, () => port + RPC_PORT_OFFSET),
  ),
);

export const serviceRpcRoutes = <Rpcs extends Rpc.Any, E, R>(options: {
  readonly group: RpcGroup.RpcGroup<Rpcs>;
  readonly handlers: Layer.Layer<Rpc.ToHandler<Rpcs>, E, R>;
  readonly callerTokens: CallerTokens;
  readonly spanPrefix: string;
}) =>
  RpcServer.layerHttp({
    group: options.group,
    path: RPC_PATH,
    protocol: "http",
    spanPrefix: options.spanPrefix,
  }).pipe(
    Layer.provide(options.handlers),
    Layer.provide(callerAuthServer(options.callerTokens)),
    Layer.provide(RpcSerialization.layerNdjson),
    Layer.provide(httpServerRouteMetrics),
  );

export const serviceRpcServer = <Rpcs extends Rpc.Any, E, R>(options: {
  readonly group: RpcGroup.RpcGroup<Rpcs>;
  readonly handlers: Layer.Layer<Rpc.ToHandler<Rpcs>, E, R>;
  readonly callerTokens: CallerTokens;
  readonly port: number;
  readonly spanPrefix: string;
}) =>
  HttpRouter.serve(serviceRpcRoutes(options), {
    middleware: httpServerMetrics,
  }).pipe(
    Layer.provide(
      BunHttpServer.layer({ hostname: "0.0.0.0", port: options.port }),
    ),
  );
