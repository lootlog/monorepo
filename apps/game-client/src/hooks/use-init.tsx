import { useGlobalStore } from "@/store/global.store";

import { gameEventsManager } from "@/lib/game-events-manager";
import { useEffect, useRef } from "react";
import { Game } from "@/lib/game";
import { installCharacterTooltipTransforms } from "@/lib/margonem-tooltips";

export const useInit = () => {
  const { setGameState } = useGlobalStore();
  const initialized = useRef(false);
  const cleanupTooltipTransforms = useRef<(() => void) | null>(null);

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
    cleanupTooltipTransforms.current = installCharacterTooltipTransforms();

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
      cleanupTooltipTransforms.current?.();
      cleanupTooltipTransforms.current = null;
      gameEventsManager.cleanup();
    };
  }, []);
};
