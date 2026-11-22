import {
  httpServerMetrics,
  httpServerRouteMetrics,
} from "@lootlog/instrumentation";
import { Layer, type Redacted } from "effect";
import { HttpRouter, HttpServer } from "effect/http";
import { BattlelogApplication } from "../src/battlelog-application.js";
import type { BattlelogOperations } from "../src/battles/battlelog-operations.js";
import {
  BattlelogRoutes,
  battlelogHttpMiddleware,
} from "../src/http/battlelog-http.js";

export const makeBattlelogTestBoundary = (
  testOperations: BattlelogOperations,
  cleanupSecret?: Redacted.Redacted<string>,
) => {
  const boundary = HttpRouter.toWebHandler(
    BattlelogRoutes.pipe(
      Layer.provide(httpServerRouteMetrics),
      Layer.provideMerge(
        Layer.succeed(
          BattlelogApplication,
          BattlelogApplication.of({
            operations: testOperations,
            port: 0,
            cleanupSecret,
          }),
        ),
      ),
      Layer.provide(HttpServer.layerServices),
    ),
    {
      disableLogger: true,
      middleware: (effect) =>
        httpServerMetrics(battlelogHttpMiddleware(effect)),
    },
  );

  return {
    dispose: boundary.dispose,
    handler: boundary.handler,
  };
};
