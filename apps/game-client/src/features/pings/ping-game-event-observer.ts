import type { GameEventObserver } from "@/processors/game-event-observer";
import { mapPingController } from "./map-ping-controller";
import { pingInteractionController } from "./ping-interaction-controller";

/** Pings belong to the map they were placed on. */
export const pingGameEventObserver: GameEventObserver = {
  mapChange: () => {
    pingInteractionController.cancel();
    mapPingController.clear();
  },
};
