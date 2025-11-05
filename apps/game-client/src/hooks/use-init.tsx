import { useGlobalStore } from "@/store/global.store";

import { gameEventsManager } from "@/lib/game-events-manager";
import { useEffect, useRef } from "react";
import { Game } from "@/lib/game";

export const useInit = () => {
  const { setGameState } = useGlobalStore();
  const initialized = useRef(false);

  const checkAndInitialize = () => {
    if (initialized.current) {
      return false;
    }

    const isGameLoaded = Game.getInitializeState();
    if (!isGameLoaded) {
      return false;
    }

    initialized.current = true;

    setGameState({
      gameInitialized: true,
    });

    gameEventsManager.setReady(true);

    return true;
  };

  useEffect(() => {
    const init = initialized;

    gameEventsManager.setupProxies();

    gameEventsManager.setGameInitCallback(() => {
      if (!init.current) {
        return checkAndInitialize();
      }

      return false;
    });

    return () => {
      gameEventsManager.cleanup();
    };
  }, []);
};
