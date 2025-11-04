import { useCallback } from "react";
import { useGlobalStore } from "@/store/global.store";
import { useNotificationsStore } from "@/store/notifications.store";
import type { GameEvent } from "@/types/margonem/game-events/game-event";
import { gameEventsStore } from "@/store/game-store/game-events.store";

import { useValidationHelpers } from "./use-validation-helpers";
import { useMessagingHandlers } from "./use-messaging-handlers";
import { useNpcProcessors } from "./use-npc-processors";
import { useLootHandlers } from "./use-loot-handlers";
import { useEventHandlers } from "./use-event-handlers";
import { useBattleEventHandler } from "@/hooks/game-events/use-battle-event-handler";

export const useGameEventHandlers = () => {
  const { gameInitialized, characterId, accountId, world } = useGlobalStore(
    (s) => s.gameState,
  );

  const { removeNotificationByNpcId } = useNotificationsStore();

  const { isValidGameState, isLootDistributionMessage } = useValidationHelpers(
    world,
    characterId,
    accountId,
  );

  const { handleSendMessage, handleSendNotification } = useMessagingHandlers();

  const {
    processNpcSettings,
    processGameNpcSettings,
    composeNpcFromEvent,
    composeNpcFromGame,
    processNpcActions,
  } = useNpcProcessors({
    handleSendMessage,
    handleSendNotification,
  });

  const { createLootFromBattle, handleUpdateLoot, handleDialogLoot } =
    useLootHandlers({
      isValidGameState,
      isLootDistributionMessage,
    });

  const {
    handleNpcDetection,
    handleInitialNpcsDetection,
    handleRespawnTimers,
    handleChatEvents,
    handleDialogEvents,
    handleBattleEvents,
  } = useEventHandlers({
    isValidGameState,
    processNpcSettings,
    processGameNpcSettings,
    composeNpcFromEvent,
    composeNpcFromGame,
    processNpcActions,
    removeNotificationByNpcId,
    createLootFromBattle,
    handleUpdateLoot,
    handleDialogLoot,
    isLootDistributionMessage,
  });

  const { handleBattleEventsV2 } = useBattleEventHandler();

  const handleEvent = useCallback(
    (event: GameEvent) => {
      if (!isValidGameState || Object.keys(event).length <= 2) return;

      if (import.meta.env.DEV) {
        gameEventsStore.addEvent(event);
      }

      if (event.chat) handleChatEvents(event);
      if (event.d) handleDialogEvents(event);
      if (event.f) handleBattleEvents(event);
      if (event.f) handleBattleEventsV2(event);
      if (event.npcs) handleNpcDetection(event);
      if (event.item) handleDialogLoot(event);
      if (event.npcs_del?.length) handleRespawnTimers(event);
    },
    [
      isValidGameState,
      handleChatEvents,
      handleDialogEvents,
      handleBattleEvents,
      handleBattleEventsV2,
      handleNpcDetection,
      handleDialogLoot,
      handleRespawnTimers,
    ],
  );

  return {
    gameInitialized,
    handleEvent,
    handleInitialNpcsDetection,
  };
};
