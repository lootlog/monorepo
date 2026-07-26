import { useEffect } from "react";
import { useGlobalStore } from "@/store/global.store";
import { EventDispatcher } from "@/lib/event-dispatcher";
import { useCharacterTooltipCatchingGuilds } from "./use-character-tooltip-catching-guilds";
import { useCharacterTooltipGameEvents } from "./use-character-tooltip-game-events";
import { useOnlineCharacterOwners } from "./use-online-character-owners";
import { useOtherCatchingGuildGlow } from "./use-other-catching-guild-glow";
import { useWhoIsHereLootlogHighlight } from "./use-who-is-here-lootlog-highlight";

let activeDispatcher: EventDispatcher | null = null;
let activeDispatcherConsumers = 0;
let initialEventsHandled = false;

const acquireEventDispatcher = () => {
  if (!activeDispatcher) {
    activeDispatcher = new EventDispatcher();
    activeDispatcher.register();
  }

  activeDispatcherConsumers += 1;
  let released = false;

  return () => {
    if (released) return;

    released = true;
    activeDispatcherConsumers -= 1;
    if (activeDispatcherConsumers > 0) return;

    activeDispatcher?.cleanup();
    activeDispatcher = null;
    activeDispatcherConsumers = 0;
    initialEventsHandled = false;
  };
};

const handleInitialEventsOnce = () => {
  if (!activeDispatcher || initialEventsHandled) return;

  initialEventsHandled = true;
  activeDispatcher.handleInitialEvents();
};

export const useGameEventHandlers = () => {
  useCharacterTooltipCatchingGuilds();
  useCharacterTooltipGameEvents();
  useOnlineCharacterOwners();
  useOtherCatchingGuildGlow();
  useWhoIsHereLootlogHighlight();

  const gameInitialized = useGlobalStore((s) => s.gameState.gameInitialized);

  useEffect(() => acquireEventDispatcher(), []);

  useEffect(() => {
    if (!gameInitialized) return;

    handleInitialEventsOnce();
  }, [gameInitialized]);
};
