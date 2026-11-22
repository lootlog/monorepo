import { publishPlayerPresence } from "@/lib/socket";
import type { GameEvent } from "@lootlog/margonem/game-events";

export class AfkProcessor {
  private previousStasis: number | null = null;

  handle(event: GameEvent): void {
    const stasis = event.h?.stasis;

    if (stasis === undefined || stasis === this.previousStasis) return;
    this.previousStasis = stasis;
    publishPlayerPresence();
  }
}
