import { getLootDistributionMessage } from "@/hooks/game-events/helpers/chat.helpers";
import { useLootStore } from "@/store/game-store/loot.store";
import { updateLoot } from "@/api";
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
      .then((confirmedShare) => {
        // An empty share means the message matched none of this loot's items,
        // e.g. a late distribution of an earlier loot; keep waiting for ours.
        if (Object.keys(confirmedShare).length === 0) return;

        if (useLootStore.getState().lastLootId === lastLootId) {
          useLootStore.getState().setLastLootId(null);
        }
      })
      .catch((error) => {
        console.warn("[ChatEventProcessor] Failed to update loot:", error);
      });
  }
}
