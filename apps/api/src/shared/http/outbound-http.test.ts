import { describe, expect, it, vi } from "#test/bun-test";
import { Effect, Fiber } from "effect";
import type { HttpClient as HttpClientValue } from "effect/unstable/http/HttpClient";
import { outboundHttpRequest } from "./outbound-http.js";

const request = {
  adapter: "test-adapter",
  method: "GET" as const,
  responseLimitBytes: 16,
  retryTimes: 2,
  timeout: "1 seconds" as const,
  url: "https://example.test/value",
};

const response = (body: Uint8Array) => ({
  status: 200,
  headers: {},
  arrayBuffer: Effect.succeed(body.buffer),
});

describe("outboundHttpRequest", () => {
  it("retries idempotent transport failures", async () => {
    let attempt = 0;
    const get = vi.fn(() => {
      attempt += 1;
      return attempt === 1
        ? Effect.fail(new Error("transport"))
        : Effect.succeed(response(new Uint8Array([1])));
    });

    await expect(
      Effect.runPromise(
        outboundHttpRequest({ get } as unknown as HttpClientValue, request),
      ),
    ).resolves.toMatchObject({ status: 200 });
    expect(get).toHaveBeenCalledTimes(2);
  });

  it("never retries mutations without an idempotency key", async () => {
    const post = vi.fn(() => Effect.fail(new Error("transport")));

    await expect(
      Effect.runPromise(
        outboundHttpRequest({ post } as unknown as HttpClientValue, {
          ...request,
          body: "{}",
          method: "POST",
          retryTimes: 3,
        }),
      ),
    ).rejects.toBeDefined();
    expect(post).toHaveBeenCalledTimes(1);
  });

  it("rejects responses beyond the configured byte limit", async () => {
    const get = vi.fn(() =>
      Effect.succeed(response(new Uint8Array(request.responseLimitBytes + 1))),
    );

    await expect(
      Effect.runPromise(
        outboundHttpRequest({ get } as unknown as HttpClientValue, request),
      ),
    ).rejects.toBeDefined();
    expect(get).toHaveBeenCalledTimes(1);
  });

  it("propagates interruption to the active request", async () => {
    let interrupted = false;
    const get = vi.fn(() =>
      Effect.never.pipe(
        Effect.onInterrupt(() =>
          Effect.sync(() => {
            interrupted = true;
          }),
        ),
      ),
    );
    const fiber = Effect.runFork(
      outboundHttpRequest({ get } as unknown as HttpClientValue, request),
    );
    while (get.mock.calls.length === 0) await Promise.resolve();

    await Effect.runPromise(Fiber.interrupt(fiber));

    expect(interrupted).toBe(true);
  });
});
