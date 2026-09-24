import { expect, it } from "bun:test";
import { Deferred, Effect, Queue } from "effect";
import { TestClock } from "effect/testing";
import { makeLootPublicationWorker } from "./loot-publication-worker.js";

it("dispatches on startup, coalesces acceptance bursts during delivery, and wakes immediately between fallback polls", async () => {
  await Effect.gen(function* () {
    const started = yield* Queue.unbounded<number>();
    const releaseFirstDelivery = yield* Deferred.make<void>();
    let runs = 0;

    const worker = yield* makeLootPublicationWorker(
      Effect.gen(function* () {
        runs += 1;
        yield* Queue.offer(started, runs);

        if (runs === 1) yield* Deferred.await(releaseFirstDelivery);
      }),
    );

    yield* worker.run.pipe(Effect.forkScoped);
    expect(yield* Queue.take(started)).toBe(1);
    yield* Effect.forEach(Array.from({ length: 100 }), () => worker.signal);
    expect(runs).toBe(1);
    yield* Deferred.succeed(releaseFirstDelivery, undefined);
    expect(yield* Queue.take(started)).toBe(2);

    yield* TestClock.adjust("999 millis");
    expect(runs).toBe(2);
    yield* TestClock.adjust("1 millis");
    expect(yield* Queue.take(started)).toBe(3);

    yield* worker.signal;
    expect(yield* Queue.take(started)).toBe(4);
  }).pipe(Effect.scoped, Effect.provide(TestClock.layer()), Effect.runPromise);
});

it("retries durable work after a failed dispatch without requiring another acceptance signal", async () => {
  await Effect.gen(function* () {
    const attempted = yield* Queue.unbounded<number>();
    let runs = 0;
    let pending = true;

    const worker = yield* makeLootPublicationWorker(
      Effect.gen(function* () {
        runs += 1;
        yield* Queue.offer(attempted, runs);

        if (runs === 1) return yield* Effect.fail("broker unavailable");
        pending = false;
      }),
    );

    yield* worker.run.pipe(Effect.forkScoped);
    expect(yield* Queue.take(attempted)).toBe(1);
    expect(pending).toBe(true);
    yield* TestClock.adjust("1 second");
    expect(yield* Queue.take(attempted)).toBe(2);
    expect(pending).toBe(false);
  }).pipe(Effect.scoped, Effect.provide(TestClock.layer()), Effect.runPromise);
});
