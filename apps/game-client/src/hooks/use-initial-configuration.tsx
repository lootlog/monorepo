import { Game } from "@/lib/game";
import { useGlobalStore } from "@/store/global.store";
import { useEffect, useRef } from "react";
import {
  recommendedSettings as recommendedDetectorSettings,
  useNpcDetectorStore,
} from "@/store/npc-detector.store";
import { useGuilds } from "@/hooks/api/use-guilds";

const HERO_ID_POLL_INTERVAL_MS = 100;
const HERO_ID_POLL_TIMEOUT_MS = 10_000;

export const useInitialConfiguration = () => {
  const { data: guilds } = useGuilds();
  const gameInitialized = useGlobalStore((s) => s.gameState.gameInitialized);
  const configInitialized = useRef(false);

  const { setSettings: setDetectorSettings, settings: detectorSettings } =
    useNpcDetectorStore();

  const initDetectorConfiguration = () => {
    const characterId = String(Game.hero.id);
    const currentSettings = detectorSettings[characterId];

    if (!currentSettings) {
      setDetectorSettings(characterId, recommendedDetectorSettings);
    }
  };

  useEffect(() => {
    if (configInitialized.current) return;

    if (gameInitialized && guilds) {
      if (Game.hero?.id) {
        initDetectorConfiguration();
        configInitialized.current = true;
        return;
      }

      const pollingStartedAt = Date.now();
      const interval = setInterval(() => {
        if (configInitialized.current) {
          clearInterval(interval);
          return;
        }

        if (Date.now() - pollingStartedAt >= HERO_ID_POLL_TIMEOUT_MS) {
          clearInterval(interval);
          return;
        }

        if (Game.hero?.id) {
          initDetectorConfiguration();
          configInitialized.current = true;
          clearInterval(interval);
        }
      }, HERO_ID_POLL_INTERVAL_MS);

      return () => clearInterval(interval);
    }
  }, [gameInitialized, guilds, initDetectorConfiguration]);
};
