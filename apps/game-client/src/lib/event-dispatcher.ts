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
import { OtherEventProcessor } from "@/processors/other-event-processor";

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
  "other",
];

function hasRelevantKey(event: GameEvent): boolean {
  for (const key of RELEVANT_EVENT_KEYS) {
    if (event[key] !== undefined) return true;
  }

  return false;
}

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
  private other = new OtherEventProcessor();

  handleEvent = (event: GameEvent): void => {
    if (!hasRelevantKey(event)) return;

    if (event.chat !== undefined) {
      runSafe("chat", () => this.chat.handle(event));
    }

    if (event.d !== undefined) {
      runSafe("dialog", () => this.dialog.handle(event));
    }

    if (event.f !== undefined) {
      runSafe("battle", () => this.battle.handle(event));
    }

    if (event.npcs !== undefined) {
      runSafe("npc-detection", () => this.npcsDetection.handle(event));
    }

    if (event.item !== undefined && event.loot?.source === "fight") {
      runSafe("loot-from-battle", () => this.loot.handleLootFromBattle(event));
    }

    if (event.item !== undefined && event.loot?.source === "dialog") {
      runSafe("dialog-loot", () => this.loot.handleDialogLoot(event));
    }

    if (event.npcs_del !== undefined) {
      runSafe("npcs-delete", () => this.npcsDelete.handle(event));
    }

    if (event.town !== undefined) {
      runSafe("map-change", () => this.mapChange.handle(event));
    }

    if (event.other !== undefined) {
      runSafe("other", () => this.other.handle(event));
    }

    if (event.h !== undefined) {
      runSafe("afk", () => this.afk.handle(event));
    }

    if (event.friends !== undefined || event.friends_max !== undefined) {
      runSafe("friends", () => this.friends.handle(event));
    }

    if (event.party !== undefined) {
      runSafe("party", () => this.party.handle(event));
    }
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
