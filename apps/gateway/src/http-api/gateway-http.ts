import { Effect, Layer } from "effect";
import { HttpRouter, HttpServer } from "effect/http";
import { HttpApiBuilder } from "effect/http-api";
import type { RealtimeHub } from "#src/realtime/realtime-hub";
import { GatewayApi } from "./gateway-api.js";

type Availability = Pick<RealtimeHub, "unavailableReason">;

const makeGatewayHandlers = (availability: Availability) =>
  HttpApiBuilder.group(GatewayApi, "health", (handlers) =>
    handlers
      .handle("GatewayHealth", () => Effect.succeed({ status: "ok" as const }))
      .handle("GatewayReadiness", () => {
        const reason = availability.unavailableReason();

        return reason === undefined
          ? Effect.succeed({ status: "ready" as const })
          : Effect.fail({ status: "unavailable" as const, reason });
      }),
  );

export const makeGatewayHttpBoundary = (availability: Availability) =>
  HttpRouter.toWebHandler(
    HttpApiBuilder.layer(GatewayApi).pipe(
      Layer.provide(makeGatewayHandlers(availability)),
      Layer.provide(HttpServer.layerServices),
    ),
    { disableLogger: true },
  );
