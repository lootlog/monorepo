import { expect, it, spyOn } from "bun:test";
import { Effect, Layer } from "effect";
import {
  HttpRouter,
  HttpServer,
  HttpServerResponse,
} from "effect/unstable/http";
import { Logger } from "../infrastructure/logger.js";
import { battlelogHttpMiddleware } from "./battlelog-http.js";

for (const { status, effect } of [
  {
    status: 499,
    effect: Effect.die(HttpServerResponse.empty({ status: 499 })),
  },
  { status: 503, effect: Effect.interrupt },
  { status: 500, effect: Effect.die(new Error("database unavailable")) },
]) {
  it(`preserves HTTP ${status} and only reports genuine application failures`, async () => {
    const errorLog = spyOn(Logger.prototype, "error").mockImplementation(
      () => {},
    );
    const boundary = HttpRouter.toWebHandler(
      HttpRouter.add("GET", "/", effect).pipe(
        Layer.provide(HttpServer.layerServices),
      ),
      { disableLogger: true, middleware: battlelogHttpMiddleware },
    );
    try {
      const response = await boundary.handler(
        new Request("http://battlelog.test/"),
      );
      expect(response.status).toBe(status);
      expect(errorLog).toHaveBeenCalledTimes(status === 500 ? 1 : 0);
    } finally {
      await boundary.dispose();
      errorLog.mockRestore();
    }
  });
}

it("does not report an aborted client request as an HTTP failure", async () => {
  const errorLog = spyOn(Logger.prototype, "error").mockImplementation(
    () => {},
  );
  const started = Promise.withResolvers<void>();
  const boundary = HttpRouter.toWebHandler(
    HttpRouter.add(
      "GET",
      "/",
      Effect.sync(() => started.resolve()).pipe(Effect.andThen(Effect.never)),
    ).pipe(Layer.provide(HttpServer.layerServices)),
    { disableLogger: true, middleware: battlelogHttpMiddleware },
  );
  try {
    const controller = new AbortController();
    const response = boundary.handler(
      new Request("http://battlelog.test/", { signal: controller.signal }),
    );
    await started.promise;
    controller.abort();
    expect((await response).status).toBe(499);
    expect(errorLog).not.toHaveBeenCalled();
  } finally {
    await boundary.dispose();
    errorLog.mockRestore();
  }
});
