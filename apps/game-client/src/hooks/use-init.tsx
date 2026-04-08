import { useGlobalStore } from "@/store/global.store";

import { gameEventsManager } from "@/lib/game-events-manager";
import { useEffect, useRef } from "react";
import { Game } from "@/lib/game";
import { toast } from "sonner";

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

    if (!window.__lootlog_early_events && !gameEventsManager.hadEarlyEvents) {
      toast.warning("Wymagana aktualizacja Lootlog", {
        description:
          "Zainstaluj ponownie skrypt Lootlog, aby korzystać z nowych funkcji.",
        duration: Infinity,
        action: {
          label: "Zainstaluj",
          onClick: () => {
            window.open(
              "https://lootlog.ink/addon",
              "_blank",
            );
          },
        },
      });
    }

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
