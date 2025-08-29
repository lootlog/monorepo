import { useCallback, useRef } from "react";
import { useGlobalStore } from "@/store/global.store";
import { useNotificationsStore } from "@/store/notifications.store";
import { GameEvent } from "@/types/margonem/game-events/game-event";
import { W } from "@/types/margonem/game-events/f";

import { useValidationHelpers } from "./use-validation-helpers";
import { useMessagingHandlers } from "./use-messaging-handlers";
import { useNpcProcessors } from "./use-npc-processors";
import { useLootHandlers } from "./use-loot-handlers";
import { useEventHandlers } from "./use-event-handlers";

export const useGameEventHandlers = (settingsRef: React.RefObject<any>) => {
  const { gameInitialized, characterId, accountId, world } = useGlobalStore(
    (s) => s.gameState
  );

  const { removeNotificationByNpcId } = useNotificationsStore();

  // Refs for tracking state
  const pendingBattle = useRef<W | null>(null);
  const talkingNpcId = useRef<string | null>(null);
  const latestLootId = useRef<number | null>(null);

  // Custom hooks
  const { isValidGameState, isLootDistributionMessage } = useValidationHelpers(
    world,
    characterId,
    accountId
  );

  const { handleSendMessage, handleSendNotification } = useMessagingHandlers();

  const {
    processNpcSettings,
    processGameNpcSettings,
    composeNpcFromEvent,
    composeNpcFromGame,
    processNpcActions,
  } = useNpcProcessors({
    settingsRef,
    handleSendMessage,
    handleSendNotification,
  });

  const { createLootFromBattle, handleUpdateLoot, handleDialogLoot } =
    useLootHandlers({
      isValidGameState,
      pendingBattle,
      talkingNpcId,
      latestLootId,
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
    pendingBattle,
    talkingNpcId,
    latestLootId,
    createLootFromBattle,
    handleUpdateLoot,
    handleDialogLoot,
    isLootDistributionMessage,
  });

  const handleEvent = useCallback(
    (event: GameEvent) => {
      // Early return for invalid events
      if (!isValidGameState || Object.keys(event).length <= 2) return;

      // Process different event types
      if (event.chat) handleChatEvents(event);
      if (event.d) handleDialogEvents(event);
      if (event.f) handleBattleEvents(event);
      if (event.npcs) handleNpcDetection(event);
      if (event.item) handleDialogLoot(event);
      if (event.npcs_del?.length) handleRespawnTimers(event);
    },
    [
      isValidGameState,
      handleChatEvents,
      handleDialogEvents,
      handleBattleEvents,
      handleNpcDetection,
      handleDialogLoot,
      handleRespawnTimers,
    ]
  );

  return {
    gameInitialized,
    handleEvent,
    handleInitialNpcsDetection,
  };
};
