import { describe, expect, it, mock } from "bun:test";
import { Effect, Fiber, Layer } from "effect";
import { FetchHttpClient, HttpClient } from "effect/unstable/http";
import type { RedisService } from "#src/redis/redis.service";
import { makeMapsOperation } from "./maps.operation.js";

type FetchImplementation = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>;

const operationWith = (
  fetchImplementation: FetchImplementation,
  redis: Pick<RedisService, "get" | "set">,
) => {
  const fetchLayer = FetchHttpClient.layer.pipe(
    Layer.provide(
      Layer.succeed(
        FetchHttpClient.Fetch,
        fetchImplementation as typeof globalThis.fetch,
      ),
    ),
  );
  return Effect.gen(function* () {
    const httpClient = yield* HttpClient.HttpClient;
    return yield* makeMapsOperation({
      httpClient,
      redis: redis as RedisService,
      url: new URL("https://maps.internal/maps"),
    });
  }).pipe(Effect.provide(fetchLayer));
};

const run = (
  fetchImplementation: FetchImplementation,
  redis: Pick<RedisService, "get" | "set">,
) => Effect.runPromise(operationWith(fetchImplementation, redis));

const redisWith = (cached?: string) => ({
  get: mock(() => Promise.resolve(cached)),
  set: mock(() => Promise.resolve()),
});

describe("maps operation", () => {
  it("returns the established cached projection without HTTP", async () => {
    const redis = redisWith('[{"id":1,"name":"Ithan"}]');
    const fetchImplementation = mock(() =>
      Promise.reject(new Error("must not fetch")),
    );

    await expect(run(fetchImplementation, redis)).resolves.toEqual([
      { id: 1, name: "Ithan" },
    ]);
    expect(fetchImplementation).not.toHaveBeenCalled();
    expect(redis.set).not.toHaveBeenCalled();
  });

  it("retries transport failures for the idempotent read and fills cache", async () => {
    const redis = redisWith();
    const fetchImplementation = mock(() => {
      if (fetchImplementation.mock.calls.length < 3) {
        return Promise.reject(new Error("connection reset"));
      }
      return Promise.resolve(Response.json([{ id: 2, name: "Torneg" }]));
    });

    await expect(run(fetchImplementation, redis)).resolves.toEqual([
      { id: 2, name: "Torneg" },
    ]);
    expect(fetchImplementation).toHaveBeenCalledTimes(3);
    expect(redis.set).toHaveBeenCalledWith(
      "maps:all",
      '[{"id":2,"name":"Torneg"}]',
      3600,
    );
  });

  it("fails soft without retrying an oversized response", async () => {
    const redis = redisWith();
    const fetchImplementation = mock(() =>
      Promise.resolve(new Response(new Uint8Array(1024 * 1024 + 1))),
    );

    await expect(run(fetchImplementation, redis)).resolves.toEqual([]);
    expect(fetchImplementation).toHaveBeenCalledTimes(1);
    expect(redis.set).not.toHaveBeenCalled();
  });

  it("propagates Effect interruption to the HTTP abort signal", async () => {
    const redis = redisWith();
    let aborted = false;
    const fetchImplementation = mock(
      (_input: RequestInfo | URL, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => {
            aborted = true;
            reject(new DOMException("aborted", "AbortError"));
          });
        }),
    );
    const fiber = Effect.runFork(operationWith(fetchImplementation, redis));
    while (fetchImplementation.mock.calls.length === 0) {
      await Promise.resolve();
    }

    await Effect.runPromise(Fiber.interrupt(fiber));

    expect(aborted).toBe(true);
  });
});
