import { useCharacterAuras } from "@/features/character-auras/hooks/use-character-auras";
import { useEffect, useRef } from "react";
import { useGlobalStore } from "@/store/global.store";
import { EventDispatcher } from "@/lib/event-dispatcher";
import { useCharacterTooltipCatchingGuilds } from "./use-character-tooltip-catching-guilds";
import { useCharacterTooltipGameEvents } from "./use-character-tooltip-game-events";
import { useOnlineCharacterOwners } from "./use-online-character-owners";
import { useOtherCatchingGuildGlow } from "./use-other-catching-guild-glow";
import { useWhoIsHereLootlogHighlight } from "./use-who-is-here-lootlog-highlight";

export const useGameEventHandlers = () => {
  useCharacterTooltipCatchingGuilds();
  useCharacterTooltipGameEvents();
  useCharacterAuras();
  useOnlineCharacterOwners();
  useOtherCatchingGuildGlow();
  useWhoIsHereLootlogHighlight();

  const gameInitialized = useGlobalStore((s) => s.gameState.gameInitialized);
  const dispatcher = useRef<EventDispatcher | null>(null);

  useEffect(() => {
    const registered = new EventDispatcher();
    registered.register();
    dispatcher.current = registered;

    return () => {
      registered.cleanup();
      dispatcher.current = null;
    };
  }, []);

  useEffect(() => {
    if (gameInitialized) dispatcher.current?.handleInitialEvents();
  }, [gameInitialized]);
};
