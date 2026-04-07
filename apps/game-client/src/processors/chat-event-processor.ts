import { getLootDistributionMessage } from "@/hooks/game-events/helpers/chat.helpers";
import { useLootStore } from "@/store/game-store/loot.store";
import { updateLoot } from "@/services/api.service";
import type { GameEvent } from "@lootlog/margonem/game-events";

export class ChatEventProcessor {
  handle(event: GameEvent): void {
    if (!event.chat) return;

    const lootDistributionMessage = getLootDistributionMessage(event);
    if (!lootDistributionMessage) return;

    this.handleUpdateLoot(lootDistributionMessage);
  }

  private handleUpdateLoot(message: string): void {
    const lastLootId = useLootStore.getState().lastLootId;
    if (!lastLootId) return;

    updateLoot({ msg: message, id: lastLootId })
      .then(() => {
        useLootStore.getState().setLastLootId(null);
      })
      .catch((error) => {
        console.warn("[ChatEventProcessor] Failed to update loot:", error);
      });
  }
}
