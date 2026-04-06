import { useUpdateLoot } from "@/hooks/api/use-update-loot";
import { getLootDistributionMessage } from "@/hooks/game-events/helpers/chat.helpers";
import { useLootStore } from "@/store/game-store/loot.store";
import type { GameEvent } from "@lootlog/margonem/game-events";

export const useChatEventsHandlers = () => {
  const { mutate: updateLoot } = useUpdateLoot();

  const handleChatEvents = (event: GameEvent) => {
    if (!event.chat) return;

    const lootDistributionMessage = getLootDistributionMessage(event);
    if (!lootDistributionMessage) return;

    handleUpdateLoot(lootDistributionMessage);
  };

  const handleUpdateLoot = (message: string) => {
    const lastLootId = useLootStore.getState().lastLootId;
    if (!lastLootId) return;

    updateLoot(
      { msg: message, id: lastLootId },
      {
        onSuccess: () => {
          useLootStore.getState().setLastLootId(null);
        },
      },
    );
  };

  return {
    handleChatEvents,
  };
};
