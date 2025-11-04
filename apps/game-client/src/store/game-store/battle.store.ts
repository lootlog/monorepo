import type { GameEvent } from "@/types/margonem/game-events/game-event";

class BattleStore {
  events: GameEvent[] = [];
  battleState: "idle" | "in-battle" = "idle";
  lastBattleHash: string = "";
}

export const battleStore = new BattleStore();
