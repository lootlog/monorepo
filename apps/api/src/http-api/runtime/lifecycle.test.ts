import { describe, expect, it } from "bun:test";
import { Deferred, Effect, Fiber, Layer } from "effect";
import { makeApiLifecycleLayer } from "./lifecycle.js";

describe("API runtime lifecycle", () => {
  it("releases scoped resources when the launched program is interrupted", async () => {
    const events: string[] = [];
    const started = Effect.runSync(Deferred.make<void>());
    const stopped = Effect.runSync(Deferred.make<void>());
    const lifecycle = makeApiLifecycleLayer({
      onStart: Effect.sync(() => {
        events.push("start");
      }).pipe(
        Effect.andThen(Deferred.succeed(started, undefined)),
        Effect.asVoid,
      ),
      onStop: Effect.sync(() => {
        events.push("stop");
      }).pipe(
        Effect.andThen(Deferred.succeed(stopped, undefined)),
        Effect.asVoid,
      ),
    });

    const fiber = Effect.runFork(Layer.launch(lifecycle));
    await Effect.runPromise(Deferred.await(started));
    await Effect.runPromise(Fiber.interrupt(fiber));
    await Effect.runPromise(Deferred.await(stopped));

    expect(events).toEqual(["start", "stop"]);
  });

  it("does not register a release action when acquisition fails", async () => {
    let stopped = false;
    const lifecycle = makeApiLifecycleLayer({
      onStart: Effect.die("startup failed"),
      onStop: Effect.sync(() => {
        stopped = true;
      }),
    });

    await Effect.runPromiseExit(Effect.scoped(Layer.build(lifecycle)));

    expect(stopped).toBe(false);
  });
});
