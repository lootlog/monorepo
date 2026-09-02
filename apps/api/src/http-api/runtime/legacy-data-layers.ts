import type { Type } from "@nestjs/common";
import { Effect, Layer } from "effect";
import { NotificationsData } from "../handlers/notifications/notifications.handlers.js";
import { LegacyNestApplication } from "./legacy-nest-application.js";
import { createControllerDispatcher } from "./legacy-controller-dispatcher.js";

/**
 * Resolves established application services from the non-listening Nest
 * container and adapts them to every Effect HTTP port. This is the single
 * compatibility seam to delete as the remaining service implementations move
 * to native Effect Layers.
 */
export const LegacyApiDataLayers = Layer.unwrap(
  Effect.gen(function* () {
    const { app } = yield* LegacyNestApplication;
    const service = <A>(token: Type<A>): A => app.get(token, { strict: false });

    const dispatch = createControllerDispatcher(app);

    return Layer.mergeAll(NotificationsData.layerLegacy(dispatch));
  }),
);
