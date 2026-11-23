import { Effect, Layer } from "effect";
import { FetchHttpClient, HttpRouter, HttpServer } from "effect/http";
import type { Rpc, RpcGroup } from "effect/rpc";
import { serviceRpcRoutes } from "./server.js";

export const makeRpcTestHttpClient = <Rpcs extends Rpc.Any, E>(
  group: RpcGroup.RpcGroup<Rpcs>,
  handlers: Layer.Layer<Rpc.ToHandler<Rpcs>, E, never>,
) =>
  Layer.unwrap(
    Effect.acquireRelease(
      Effect.sync(() =>
        HttpRouter.toWebHandler(
          Layer.mergeAll(
            // SAFETY: test RPC groups in this repo declare no server middleware or request services, so the only remaining requirement is HttpRouter.
            serviceRpcRoutes({ group, handlers }) as Layer.Layer<
              never,
              E,
              HttpRouter.HttpRouter
            >,
            HttpServer.layerServices,
          ),
          { disableLogger: true },
        ),
      ),
      (web) => Effect.promise(() => web.dispose()),
    ).pipe(
      Effect.map((web) =>
        FetchHttpClient.layer.pipe(
          Layer.provide(
            Layer.succeed(
              FetchHttpClient.Fetch,
              Object.assign(
                (input: string | URL | Request, init?: RequestInit) =>
                  web.handler(new Request(input, init)),
                { preconnect: () => {} },
              ),
            ),
          ),
        ),
      ),
    ),
  );
