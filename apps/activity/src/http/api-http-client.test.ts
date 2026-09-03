import { describe, expect, it, mock } from "bun:test";
import { Effect, Layer } from "effect";
import { FetchHttpClient } from "effect/unstable/http";
import { ApiHttpClient, ApiHttpClientFailure } from "./api-http-client.js";

type FetchImplementation = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>;

const runWith = (
  fetchImplementation: FetchImplementation,
  operationId = "Activity.test",
) => {
  const fetchLayer = FetchHttpClient.layer.pipe(
    Layer.provide(
      Layer.succeed(
        FetchHttpClient.Fetch,
        fetchImplementation as typeof globalThis.fetch,
      ),
    ),
  );
  return Effect.runPromise(
    Effect.flatMap(ApiHttpClient, (client) =>
      client.get(operationId, "https://api.internal/resource"),
    ).pipe(Effect.provide(ApiHttpClient.layer), Effect.provide(fetchLayer)),
  );
};

describe("Activity API HttpClient", () => {
  it("retries idempotent transport failures and returns the bounded body", async () => {
    const fetchImplementation = mock(async () => {
      if (fetchImplementation.mock.calls.length < 3) {
        throw new Error("connection reset");
      }
      return new Response(JSON.stringify({ id: "guild-1" }), { status: 200 });
    });

    const response = await runWith(fetchImplementation);

    expect(fetchImplementation).toHaveBeenCalledTimes(3);
    expect(response.status).toBe(200);
    expect(JSON.parse(new TextDecoder().decode(response.body))).toEqual({
      id: "guild-1",
    });
  });

  it("rejects responses above the configured one-megabyte limit", async () => {
    const fetchImplementation = mock(
      async () => new Response(new Uint8Array(1024 * 1024 + 1)),
    );

    await expect(runWith(fetchImplementation)).rejects.toMatchObject({
      _tag: "ApiHttpClientFailure",
      reason: "response-too-large",
      retryable: false,
    } satisfies Partial<ApiHttpClientFailure>);
    expect(fetchImplementation).toHaveBeenCalledTimes(1);
  });

  it("does not retry completed non-success responses", async () => {
    const fetchImplementation = mock(
      async () => new Response("missing", { status: 404 }),
    );

    await expect(runWith(fetchImplementation)).resolves.toMatchObject({
      status: 404,
    });
    expect(fetchImplementation).toHaveBeenCalledTimes(1);
  });
});
