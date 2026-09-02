import { Effect, Layer } from "effect";
import { HttpRouter, HttpServer } from "effect/unstable/http";
import { HttpApiBuilder } from "effect/unstable/httpapi";
import { GatewayApi } from "./gateway-api.js";

const GatewayHandlers = HttpApiBuilder.group(GatewayApi, "health", (handlers) =>
  handlers.handle("GatewayHealth", () =>
    Effect.succeed({ status: "ok" as const }),
  ),
);

const GatewayRoutes = HttpApiBuilder.layer(GatewayApi).pipe(
  Layer.provide(GatewayHandlers),
);

export const makeGatewayHttpBoundary = () =>
  HttpRouter.toWebHandler(
    GatewayRoutes.pipe(Layer.provide(HttpServer.layerServices)),
    { disableLogger: true },
  );
