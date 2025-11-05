import { useEffect, useEffectEvent, useState } from "react";
import { useGlobalStore } from "@/store/global.store";
import type { GameEvent } from "@/types/margonem/game-events/game-event";

import { useLootHandlers } from "./use-loot-handlers";
import { useBattleEventHandler } from "@/hooks/game-events/use-battle-event-handler";
import { gameEventsManager } from "@/lib/game-events-manager";
import { useChatEventsHandlers } from "@/hooks/game-events/use-chat-events-handler";
import { useDialogHandlers } from "@/hooks/game-events/use-dialog-handlers";
import { useNpcsHandlers } from "@/hooks/game-events/use-npcs-handler";
import { useNpcsDeleteHandlers } from "@/hooks/game-events/use-npcs-delete-handlers";

const RELEVANT_EVENT_KEYS: (keyof GameEvent)[] = [
  "chat",
  "d",
  "npcs",
  "npcs_del",
  "item",
  "loot",
  "f",
];

export const useGameEventHandlers = () => {
  const gameInitialized = useGlobalStore((s) => s.gameState.gameInitialized);
  const [initialized, setInitialized] = useState(false);

  const { handleChatEvents } = useChatEventsHandlers();
  const { handleDialogEvents } = useDialogHandlers();
  const { handleNpcDetection, handleInitialNpcsDetection } = useNpcsHandlers();
  const { handleLootFromBattle, handleDialogLoot } = useLootHandlers();
  const { handleBattleEvents } = useBattleEventHandler();
  const { handleNpcsDelete } = useNpcsDeleteHandlers();

  const handleEvent = (event: GameEvent) => {
    // Check for relevant event keys
    const hasRelevantKey = RELEVANT_EVENT_KEYS.some(
      (key) => event[key] !== undefined,
    );
    if (!hasRelevantKey) return;

    // Process different event types
    handleChatEvents(event);
    handleDialogEvents(event);
    handleBattleEvents(event);
    handleNpcDetection(event);
    handleLootFromBattle(event);
    handleDialogLoot(event);
    handleNpcsDelete(event);
  };

  const setupGameEventHandler = useEffectEvent(() => {
    gameEventsManager.setProcessor(handleEvent);

    setInitialized(true);
  });

  const removeGameEventsHandler = useEffectEvent(() => {
    gameEventsManager.removeProcessor();
  });

  const handleInitialEvents = useEffectEvent(() => {
    handleInitialNpcsDetection();
  });

  useEffect(() => {
    if (!gameInitialized || !initialized) return;

    handleInitialEvents();
  }, [gameInitialized, initialized]);

  useEffect(() => {
    if (initialized) return;

    setupGameEventHandler();
  }, [initialized]);

  useEffect(() => {
    return () => {
      removeGameEventsHandler();
    };
  }, []);
};
