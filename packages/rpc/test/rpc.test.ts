import { expect, test } from "bun:test";
import { Effect, Redacted, Schema } from "effect";
import { Rpc, RpcGroup } from "effect/rpc";
import { CallerAuth, RpcCallers } from "../src/callers.js";
import { makeRpcClient, type ServiceRpcClient } from "../src/client.js";
import { RpcNotFoundError } from "../src/errors.js";
import { makeRpcTestHttpClient, TEST_RPC_TOKEN } from "../src/testing.js";

class TestRpcGroup extends RpcGroup.make(
  Rpc.make("echo", {
    payload: { value: Schema.String },
    success: Schema.Struct({ echoed: Schema.String }),
    error: RpcNotFoundError,
  }).annotate(RpcCallers, ["gateway"]),
  Rpc.make("apiOnly", {
    success: Schema.Literal("ok"),
  }).annotate(RpcCallers, ["api"]),
  Rpc.make("undeclared", {
    success: Schema.Literal("ok"),
  }),
).middleware(CallerAuth) {}

const handlers = TestRpcGroup.toLayer({
  echo: ({ value }) =>
    value === "missing"
      ? Effect.fail(new RpcNotFoundError({ message: "not found" }))
      : Effect.succeed({ echoed: value }),
  apiOnly: () => Effect.succeed("ok" as const),
  undeclared: () => Effect.succeed("ok" as const),
});

const withClient = <A, E>(
  token: Redacted.Redacted<string>,
  use: (client: ServiceRpcClient<typeof TestRpcGroup>) => Effect.Effect<A, E>,
) =>
  Effect.runPromise(
    makeRpcClient(TestRpcGroup, {
      url: "http://rpc.test",
      token,
      spanPrefix: "test.rpc-client",
    }).pipe(
      Effect.flatMap(use),
      Effect.scoped,
      Effect.provide(
        makeRpcTestHttpClient(TestRpcGroup, handlers, ["gateway"]),
      ),
    ),
  );

test("an allowed caller receives successes and typed errors", async () => {
  await withClient(TEST_RPC_TOKEN, (client) =>
    Effect.gen(function* () {
      expect(yield* client.echo({ value: "hello" })).toEqual({
        echoed: "hello",
      });
      expect(
        yield* client.echo({ value: "missing" }).pipe(Effect.flip),
      ).toBeInstanceOf(RpcNotFoundError);
    }),
  );
});

test("a caller without the configured token is rejected before the handler", async () => {
  const failure = await withClient(Redacted.make("another-token"), (client) =>
    client.echo({ value: "hello" }).pipe(Effect.flip),
  );

  expect(failure._tag).toBe("RpcCallerRejectedError");
});

test("a caller is rejected on procedures that do not list it", async () => {
  const failures = await withClient(TEST_RPC_TOKEN, (client) =>
    Effect.all([
      client.apiOnly().pipe(Effect.flip),
      client.undeclared().pipe(Effect.flip),
    ]),
  );

  expect(failures.map((failure) => failure._tag)).toEqual([
    "RpcCallerRejectedError",
    "RpcCallerRejectedError",
  ]);
});
