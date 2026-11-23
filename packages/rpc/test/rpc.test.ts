import { describe, expect, test } from "bun:test";
import { Effect, Layer, Schema } from "effect";
import { FetchHttpClient, HttpRouter, HttpServer } from "effect/http";
import { Rpc, RpcGroup } from "effect/rpc";
import { makeRpcClient } from "../src/client.js";
import { RpcNotFoundError } from "../src/errors.js";
import { serviceRpcRoutes } from "../src/server.js";

class TestRpcGroup extends RpcGroup.make(
  Rpc.make("echo", {
    payload: { value: Schema.String },
    success: Schema.Struct({ echoed: Schema.String }),
    error: RpcNotFoundError,
  }),
) {}

const testHandlers = TestRpcGroup.toLayer({
  echo: ({ value }) =>
    value === "missing"
      ? Effect.fail(new RpcNotFoundError({ message: "not found" }))
      : Effect.succeed({ echoed: value }),
});

describe("@lootlog/rpc", () => {
  test("round-trips success and typed errors over HTTP NDJSON", async () => {
    const web = HttpRouter.toWebHandler(
      Layer.mergeAll(
        serviceRpcRoutes({
          group: TestRpcGroup,
          handlers: testHandlers,
          spanPrefix: "test.rpc",
        }),
        HttpServer.layerServices,
      ),
    );

    const inMemoryFetch = Layer.succeed(
      FetchHttpClient.Fetch,
      Object.assign(
        (input: string | URL | Request, init?: RequestInit) =>
          web.handler(new Request(input, init)),
        { preconnect: () => {} },
      ),
    );

    try {
      const program = Effect.gen(function* () {
        const client = yield* makeRpcClient(TestRpcGroup, {
          url: "http://rpc.internal:4001",
        });

        const ok = yield* client.echo({ value: "hello" });
        expect(ok).toEqual({ echoed: "hello" });

        const failed = yield* client
          .echo({ value: "missing" })
          .pipe(Effect.flip);

        expect(failed._tag).toBe("RpcNotFoundError");
      }).pipe(
        Effect.scoped,
        Effect.provide(
          FetchHttpClient.layer.pipe(Layer.provide(inMemoryFetch)),
        ),
      );

      await Effect.runPromise(program);
    } finally {
      await web.dispose();
    }
  });
});
