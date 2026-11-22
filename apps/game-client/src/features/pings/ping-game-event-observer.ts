import type { GameEventObserver } from "@/processors/game-event-observer";
import { mapPingController } from "./map-ping-controller";
import { pingInteractionController } from "./ping-interaction-controller";

export const pingGameEventObserver: GameEventObserver = {
  mapChange: () => {
    pingInteractionController.cancel();
    mapPingController.clear();
  },
};
