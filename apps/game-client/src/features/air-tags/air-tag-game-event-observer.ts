import type { GameEventObserver } from "@/processors/game-event-observer";
import { airTagObservationController } from "./air-tag-observation-controller";
import { airTagRuntime } from "./air-tag-runtime";

export const airTagGameEventObserver: GameEventObserver = {
  reload: () => airTagObservationController.forgetTargets(),
  other: (other) => airTagObservationController.handle(other),
  mapChange: (mapId) => airTagRuntime.handleMapChange(mapId),
};
