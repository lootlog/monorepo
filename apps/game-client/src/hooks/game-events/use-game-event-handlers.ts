import { useEffect, useRef, useState } from "react";
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
  useOnlineCharacterOwners();
  useOtherCatchingGuildGlow();
  useWhoIsHereLootlogHighlight();

  const gameInitialized = useGlobalStore((s) => s.gameState.gameInitialized);
  const [initialized, setInitialized] = useState(false);
  const dispatcherRef = useRef<EventDispatcher | null>(null);

  useEffect(() => {
    if (initialized) return;

    const dispatcher = new EventDispatcher();
    dispatcherRef.current = dispatcher;
    dispatcher.register();
    setInitialized(true);
  }, [initialized]);

  useEffect(() => {
    if (!gameInitialized || !initialized) return;

    dispatcherRef.current?.handleInitialEvents();
  }, [gameInitialized, initialized]);

  useEffect(() => {
    return () => {
      dispatcherRef.current?.cleanup();
    };
  }, []);
};
