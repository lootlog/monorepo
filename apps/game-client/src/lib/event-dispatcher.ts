import type { GameEvent } from "@lootlog/margonem/game-events";
import { gameEventsManager } from "@/lib/game-events-manager";
import { BattleEventProcessor } from "@/processors/battle-event-processor";
import { LootEventProcessor } from "@/processors/loot-event-processor";
import { ChatEventProcessor } from "@/processors/chat-event-processor";
import { DialogProcessor } from "@/processors/dialog-processor";
import { npcsDetectionProcessor } from "@/processors/npcs-detection-processor";
import { NpcsDeleteProcessor } from "@/processors/npcs-delete-processor";
import { MapChangeProcessor } from "@/processors/map-change-processor";
import { AfkProcessor } from "@/processors/afk-processor";
import { FriendsProcessor } from "@/processors/friends-processor";
import { PartyProcessor } from "@/processors/party-processor";

const RELEVANT_EVENT_KEYS: (keyof GameEvent)[] = [
  "chat",
  "d",
  "npcs",
  "npcs_del",
  "item",
  "loot",
  "f",
  "h",
  "town",
  "friends",
  "friends_max",
  "party",
];

function runSafe(name: string, handler: () => unknown): void {
  try {
    const result = handler();

    if (result instanceof Promise) {
      result.catch((error) => {
        console.warn(
          `[EventDispatcher] Failed to process ${name} handler:`,
          error,
        );
      });
    }
  } catch (error) {
    console.warn(`[EventDispatcher] Failed to process ${name} handler:`, error);
  }
}

export class EventDispatcher {
  private battle = new BattleEventProcessor();
  private loot = new LootEventProcessor();
  private chat = new ChatEventProcessor();
  private dialog = new DialogProcessor();
  private npcsDetection = npcsDetectionProcessor;
  private npcsDelete = new NpcsDeleteProcessor();
  private mapChange = new MapChangeProcessor();
  private afk = new AfkProcessor();
  private friends = new FriendsProcessor();
  private party = new PartyProcessor();

  handleEvent = (event: GameEvent): void => {
    const hasRelevantKey = RELEVANT_EVENT_KEYS.some(
      (key) => event[key] !== undefined,
    );
    if (!hasRelevantKey) return;

    runSafe("chat", () => this.chat.handle(event));
    runSafe("dialog", () => this.dialog.handle(event));
    runSafe("battle", () => this.battle.handle(event));
    runSafe("npc-detection", () => this.npcsDetection.handle(event));
    runSafe("loot-from-battle", () => this.loot.handleLootFromBattle(event));
    runSafe("dialog-loot", () => this.loot.handleDialogLoot(event));
    runSafe("npcs-delete", () => this.npcsDelete.handle(event));
    runSafe("map-change", () => this.mapChange.handle(event));
    runSafe("afk", () => this.afk.handle(event));
    runSafe("friends", () => this.friends.handle(event));
    runSafe("party", () => this.party.handle(event));
  };

  handleInitialEvents(): void {
    this.npcsDetection.handleInitialDetection();
    this.party.handleInitialDetection();
    gameEventsManager.markStripFriendsFromNextEvent();
  }

  register(): void {
    gameEventsManager.setProcessor(this.handleEvent);
  }

  cleanup(): void {
    gameEventsManager.removeProcessor();
  }
}
