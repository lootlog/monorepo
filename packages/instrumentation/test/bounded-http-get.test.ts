import { expect, test } from "bun:test";
import { Effect, Layer } from "effect";
import { FetchHttpClient, HttpClient } from "effect/unstable/http";
import { boundedHttpGet } from "../src/bounded-http-get.js";

const run = (
  response: "successful" | "raw",
  fetchResponse: () => Promise<Response>,
  retries = 2,
) =>
  Effect.runPromise(
    Effect.gen(function* () {
      const client = yield* HttpClient.HttpClient;
      return yield* boundedHttpGet({
        client,
        url: "https://example.invalid",
        response,
        retries,
        timeoutMilliseconds: 3000,
        operationId: "test",
        adapter: "test",
        failure: (reason, retryable, status) => ({ reason, retryable, status }),
        decode: (body, status) => ({
          body: new TextDecoder().decode(body),
          status,
        }),
      }).pipe(Effect.result);
    }).pipe(
      Effect.provide(
        FetchHttpClient.layer.pipe(
          Layer.provide(
            Layer.succeed(
              FetchHttpClient.Fetch,
              Object.assign(fetchResponse, {
                preconnect: globalThis.fetch.preconnect,
              }),
            ),
          ),
        ),
      ),
    ),
  );

test("successful-response policy retries server status with caller's exact budget", async () => {
  let calls = 0;
  const result = await run(
    "successful",
    () => {
      calls++;
      return Promise.resolve(new Response("unavailable", { status: 503 }));
    },
    3,
  );
  expect(calls).toBe(4);
  expect(result).toMatchObject({
    _tag: "Failure",
    failure: { reason: "status", retryable: true, status: 503 },
  });
});

test("raw policy returns non-success responses without retrying", async () => {
  let calls = 0;
  const result = await run("raw", () => {
    calls++;
    return Promise.resolve(new Response("unavailable", { status: 503 }));
  });
  expect(calls).toBe(1);
  expect(result).toMatchObject({
    _tag: "Success",
    success: { body: "unavailable", status: 503 },
  });
});

test.each(["successful", "raw"] as const)(
  "%s response size failures retain policy-specific status without retrying",
  async (response) => {
    let calls = 0;
    const result = await run(response, () => {
      calls++;
      return Promise.resolve(new Response(new Uint8Array(1024 * 1024 + 1)));
    });
    expect(calls).toBe(1);
    expect(result).toMatchObject({
      _tag: "Failure",
      failure: {
        reason: "response-too-large",
        retryable: false,
        status: response === "raw" ? 200 : undefined,
      },
    });
  },
);
