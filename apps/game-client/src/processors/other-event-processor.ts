import { airTagObservationController } from "@/features/air-tags/air-tag-observation-controller";
import type { GameEvent } from "@lootlog/margonem/game-events";

export class OtherEventProcessor {
  handle(event: GameEvent): void {
    if (!event.other) return;

    airTagObservationController.handle(event.other);
  }
}
