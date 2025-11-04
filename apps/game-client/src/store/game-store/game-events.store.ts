import type { W } from "@/types/margonem/game-events/f";
import type { GameEvent } from "@/types/margonem/game-events/game-event";

class GameEventsStore {
  pendingBattle: W | null = null;
  talkingNpcId: string | null = null;
  latestLootId: number | null = null;

  eventHistory: GameEvent[] = [];
  maxHistorySize: number = 100;

  setPendingBattle(battle: W | null) {
    this.pendingBattle = battle;
  }

  setTalkingNpcId(id: string | null) {
    this.talkingNpcId = id;
  }

  setLatestLootId(id: number | null) {
    this.latestLootId = id;
  }

  addEvent(event: GameEvent) {
    this.eventHistory.unshift(event);
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory.pop();
    }
  }

  clearHistory() {
    this.eventHistory = [];
  }

  reset() {
    this.pendingBattle = null;
    this.talkingNpcId = null;
    this.latestLootId = null;
    this.eventHistory = [];
  }
}

export const gameEventsStore = new GameEventsStore();
