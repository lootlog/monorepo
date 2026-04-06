import { useEffect, useEffectEvent, useState } from "react";
import { useGlobalStore } from "@/store/global.store";
import type { GameEvent } from "@lootlog/margonem-types/game-events";

import { useLootHandlers } from "./use-loot-handlers";
import { useBattleEventHandler } from "@/hooks/game-events/use-battle-event-handler";
import { gameEventsManager } from "@/lib/game-events-manager";
import { useChatEventsHandlers } from "@/hooks/game-events/use-chat-events-handler";
import { useDialogHandlers } from "@/hooks/game-events/use-dialog-handlers";
import { useNpcsHandlers } from "@/hooks/game-events/use-npcs-handler";
import { useNpcsDeleteHandlers } from "@/hooks/game-events/use-npcs-delete-handlers";
import { useMapChangeHandler } from "@/hooks/game-events/use-map-change-handler";
import { useAfkHandler } from "@/hooks/game-events/use-afk-handler";
import { useFriendsHandler } from "@/hooks/game-events/use-friends-handler";
import { usePartyHandler } from "@/hooks/game-events/use-party-handler";

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

export const useGameEventHandlers = () => {
  const gameInitialized = useGlobalStore((s) => s.gameState.gameInitialized);
  const [initialized, setInitialized] = useState(false);

  const { handleChatEvents } = useChatEventsHandlers();
  const { handleDialogEvents } = useDialogHandlers();
  const { handleNpcDetection, handleInitialNpcsDetection } = useNpcsHandlers();
  const { handleLootFromBattle, handleDialogLoot } = useLootHandlers();
  const { handleBattleEvents } = useBattleEventHandler();
  const { handleNpcsDelete } = useNpcsDeleteHandlers();
  const { handleMapChange } = useMapChangeHandler();
  const { handleAfkEvent } = useAfkHandler();
  const { handleFriendsEvent, fetchFriends } = useFriendsHandler();
  const { handlePartyEvent, handleInitialPartyDetection } = usePartyHandler();

  const runEventHandler = (handlerName: string, handler: () => unknown) => {
    try {
      const result = handler();

      if (result instanceof Promise) {
        result.catch((error) => {
          console.warn(
            `[GameEventHandlers] Failed to process ${handlerName} handler:`,
            error,
          );
        });
      }
    } catch (error) {
      console.warn(
        `[GameEventHandlers] Failed to process ${handlerName} handler:`,
        error,
      );
    }
  };

  const handleEvent = (event: GameEvent) => {
    // Check for relevant event keys
    const hasRelevantKey = RELEVANT_EVENT_KEYS.some(
      (key) => event[key] !== undefined,
    );
    if (!hasRelevantKey) return;

    // Process different event types
    runEventHandler("chat", () => handleChatEvents(event));
    runEventHandler("dialog", () => handleDialogEvents(event));
    runEventHandler("battle", () => handleBattleEvents(event));
    runEventHandler("npc-detection", () => handleNpcDetection(event));
    runEventHandler("loot-from-battle", () => handleLootFromBattle(event));
    runEventHandler("dialog-loot", () => handleDialogLoot(event));
    runEventHandler("npcs-delete", () => handleNpcsDelete(event));
    runEventHandler("map-change", () => handleMapChange(event));
    runEventHandler("afk", () => handleAfkEvent(event));
    runEventHandler("friends", () => handleFriendsEvent(event));
    runEventHandler("party", () => handlePartyEvent(event));
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
    handleInitialPartyDetection();
    gameEventsManager.markStripFriendsFromNextEvent();
    // fetchFriends();
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
