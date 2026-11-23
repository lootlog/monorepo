import { Effect, Layer, Redacted } from "effect";
import { FetchHttpClient, HttpRouter, HttpServer } from "effect/http";
import type { Rpc, RpcGroup } from "effect/rpc";
import type { CallerTokens, RpcService, RpcUpstream } from "./callers.js";
import { serviceRpcRoutes } from "./server.js";

export const TEST_RPC_TOKEN = Redacted.make("test-rpc-token");

export const testRpcUpstream = {
  url: "http://rpc.test",
  token: TEST_RPC_TOKEN,
} satisfies RpcUpstream;

export const makeRpcTestHttpClient = <Rpcs extends Rpc.Any, E>(
  group: RpcGroup.RpcGroup<Rpcs>,
  handlers: Layer.Layer<Rpc.ToHandler<Rpcs>, E, never>,
  callers: ReadonlyArray<RpcService>,
) =>
  Layer.unwrap(
    Effect.acquireRelease(
      Effect.sync(() =>
        HttpRouter.toWebHandler(
          Layer.mergeAll(
            // SAFETY: test RPC groups in this repo declare no request services beyond CallerAuth, which serviceRpcRoutes provides, so the only remaining requirement is HttpRouter.
            serviceRpcRoutes({
              group,
              handlers,
              callerTokens: Object.fromEntries(
                callers.map((caller) => [caller, TEST_RPC_TOKEN]),
              ) satisfies CallerTokens,
              spanPrefix: "test.rpc",
            }) as Layer.Layer<never, E, HttpRouter.HttpRouter>,
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
