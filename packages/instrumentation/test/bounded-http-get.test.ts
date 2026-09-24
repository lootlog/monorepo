import { expect, test } from "bun:test";
import { Effect, Layer, Result } from "effect";
import { FetchHttpClient, HttpClient } from "effect/unstable/http";
import { boundedHttpGet } from "../src/bounded-http-get.js";

const run = (
  response: "successful" | "raw",
  fetchResponse: (...args: Parameters<typeof fetch>) => Promise<Response>,
  retries = 2,
  timeoutMilliseconds = 3000,
) =>
  Effect.runPromise(
    Effect.gen(function* () {
      const client = yield* HttpClient.HttpClient;

      return yield* boundedHttpGet({
        client,
        url: "https://example.invalid",
        response,
        retries,
        timeoutMilliseconds,
        operationId: "test",
        adapter: "test",
        failure: (reason, retryable, status) => ({ reason, retryable, status }),
        decode: (body, status) => ({
          body: new TextDecoder().decode(body),
          status,
        }),
      }).pipe(Effect.result);
    }).pipe(
      Effect.timeout(1000),
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

test("cancels stalled response bodies before retrying within the caller's budget", async () => {
  const signals: AbortSignal[] = [];
  let calls = 0;
  let cancellations = 0;

  const result = await run(
    "successful",
    (_input, init) => {
      calls++;

      if (init?.signal) signals.push(init.signal);

      return Promise.resolve(
        new Response(
          new ReadableStream<Uint8Array>({
            cancel() {
              cancellations++;
            },
          }),
        ),
      );
    },
    2,
    20,
  );

  expect(result).toMatchObject({
    failure: { reason: "timeout", retryable: true },
  });
  expect(calls).toBe(3);
  expect(cancellations).toBe(3);
  expect(signals).toHaveLength(3);
  expect(signals.every((signal) => signal.aborted)).toBe(true);
});

test.each([
  { status: 503, calls: 4, retryable: true },
  { status: 404, calls: 1, retryable: false },
])(
  "successful policy aborts rejected $status responses with the caller's retry budget",
  async (expected) => {
    let calls = 0;
    const signals: AbortSignal[] = [];

    const result = await run(
      "successful",
      (_input, init) => {
        calls++;

        if (init?.signal) signals.push(init.signal);

        return Promise.resolve(
          new Response(new ReadableStream<Uint8Array>(), {
            status: expected.status,
          }),
        );
      },
      3,
    );

    expect(calls).toBe(expected.calls);
    expect(signals).toHaveLength(expected.calls);
    expect(signals.every((signal) => signal.aborted)).toBe(true);
    expect(Result.isFailure(result)).toBe(true);
    expect(result).toMatchObject({
      failure: {
        reason: "status",
        retryable: expected.retryable,
        status: expected.status,
      },
    });
  },
);

test("raw policy returns non-success responses without retrying", async () => {
  let calls = 0;

  const result = await run("raw", () => {
    calls++;

    return Promise.resolve(new Response("unavailable", { status: 503 }));
  });

  expect(calls).toBe(1);
  expect(Result.isSuccess(result)).toBe(true);
  expect(result).toMatchObject({
    success: { body: "unavailable", status: 503 },
  });
});

test.each(["successful", "raw"] as const)(
  "%s policy cancels an oversized open stream without reading further or retrying",
  async (response) => {
    let calls = 0;
    let reads = 0;
    let cancellations = 0;
    const signals: AbortSignal[] = [];

    const result = await run(response, (_input, init) => {
      calls++;

      if (init?.signal) signals.push(init.signal);

      return Promise.resolve(
        new Response(
          new ReadableStream<Uint8Array>(
            {
              pull(controller) {
                reads++;

                if (reads <= 2) controller.enqueue(new Uint8Array(512 * 1024));

                if (reads === 3) controller.enqueue(new Uint8Array(1));
              },
              cancel() {
                cancellations++;
              },
            },
            { highWaterMark: 0 },
          ),
          { headers: { "content-length": "1" } },
        ),
      );
    });

    expect(calls).toBe(1);
    expect(reads).toBe(3);
    expect(cancellations).toBe(1);
    expect(signals).toHaveLength(1);
    expect(signals.every((signal) => signal.aborted)).toBe(true);
    expect(Result.isFailure(result)).toBe(true);
    expect(result).toMatchObject({
      failure: {
        reason: "response-too-large",
        retryable: false,
        status: response === "raw" ? 200 : undefined,
      },
    });
  },
);

test("decodes a chunked body exactly at the byte limit, including split UTF-8 and empty chunks", async () => {
  const body = "ą".repeat(512 * 1024);
  const bytes = new TextEncoder().encode(body);

  const result = await run("successful", () =>
    Promise.resolve(
      new Response(
        new ReadableStream<Uint8Array>({
          start(controller) {
            controller.enqueue(bytes.subarray(0, 1));
            controller.enqueue(new Uint8Array(0));
            controller.enqueue(bytes.subarray(1, 100));
            controller.enqueue(bytes.subarray(100));
            controller.close();
          },
        }),
      ),
    ),
  );

  expect(result).toMatchObject({ success: { body, status: 200 } });
});

test.each(["successful", "raw"] as const)(
  "%s policy decodes a response with no body as empty bytes",
  async (response) => {
    const result = await run(response, () =>
      Promise.resolve(new Response(null, { status: 204 })),
    );

    expect(result).toMatchObject({ success: { body: "", status: 204 } });
  },
);

test.each([
  { response: "successful", status: 200, calls: 1, retryable: false },
  { response: "raw", status: 404, calls: 1, retryable: false },
  { response: "raw", status: 503, calls: 3, retryable: true },
] as const)(
  "$response policy preserves retries and status for a broken $status body",
  async (expected) => {
    let calls = 0;

    const result = await run(expected.response, () => {
      calls++;

      return Promise.resolve(
        new Response(
          new ReadableStream<Uint8Array>({
            pull(controller) {
              controller.error(new Error("response connection reset"));
            },
          }),
          { status: expected.status },
        ),
      );
    });

    expect(calls).toBe(expected.calls);
    expect(result).toMatchObject({
      failure: {
        reason: "invalid-response",
        retryable: expected.retryable,
        status: expected.response === "raw" ? expected.status : undefined,
      },
    });
  },
);
