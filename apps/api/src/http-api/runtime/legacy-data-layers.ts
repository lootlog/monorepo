import type { Type } from "@nestjs/common";
import { Effect, Layer } from "effect";
import { KillsService } from "#src/kills/kills.service";
import { LootAllocationService } from "#src/loots/loot-allocation.service";
import { LootSubmissionAcceptanceService } from "#src/loots/loot-submission-acceptance.service";
import { LootStatsService } from "#src/loots/services/loot-stats.service";
import { LootsService } from "#src/loots/loots.service";
import { EventsData } from "../handlers/events/events.handlers.js";
import { legacyKillsLootsDataLayer } from "../handlers/kills-loots/kills-loots.legacy-layer.js";
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

    const loots = service(LootsService);
    const dispatch = createControllerDispatcher(app);

    return Layer.mergeAll(
      EventsData.layerLegacy(dispatch),
      legacyKillsLootsDataLayer({
        kills: service(KillsService),
        loots,
        lootStats: service(LootStatsService),
        lootSubmissionAcceptance: service(LootSubmissionAcceptanceService),
        lootAllocation: service(LootAllocationService),
      }),
      NotificationsData.layerLegacy(dispatch),
    );
  }),
);
