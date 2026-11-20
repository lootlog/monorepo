import { useEffect, useRef } from "react";
import { useGlobalStore } from "@/store/global.store";
import { EventDispatcher } from "@/lib/event-dispatcher";
import type { GameEventObserver } from "@/processors/game-event-observer";
import { useCharacterTooltipCatchingGuilds } from "./use-character-tooltip-catching-guilds";
import { useCharacterTooltipGameEvents } from "./use-character-tooltip-game-events";
import { useOnlineCharacterOwners } from "./use-online-character-owners";
import { useOtherCatchingGuildGlow } from "./use-other-catching-guild-glow";
import { useWhoIsHereLootlogHighlight } from "./use-who-is-here-lootlog-highlight";

export const useGameEventHandlers = (
  observers: readonly GameEventObserver[],
) => {
  useCharacterTooltipCatchingGuilds();
  useCharacterTooltipGameEvents();
  useOnlineCharacterOwners();
  useOtherCatchingGuildGlow();
  useWhoIsHereLootlogHighlight();

  const gameInitialized = useGlobalStore((s) => s.gameState.gameInitialized);
  const dispatcher = useRef<EventDispatcher | null>(null);

  useEffect(() => {
    const registered = new EventDispatcher({ observers });
    registered.register();
    dispatcher.current = registered;

    return () => {
      registered.cleanup();
      dispatcher.current = null;
    };
  }, [observers]);

  useEffect(() => {
    if (gameInitialized) dispatcher.current?.handleInitialEvents();
  }, [gameInitialized]);
};
