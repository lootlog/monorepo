import { Game } from "@/lib/game";
import { useGlobalStore } from "@/store/global.store";
import { useEffect, useRef } from "react";
import {
  type NotificationsSettings,
  recommendedSettings as recommendedNotificationsSettings,
  useNotificationsStore,
} from "@/store/notifications.store";
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
  const {
    settings: notificationsSettings,
    setSettings: setNotificationsSettings,
  } = useNotificationsStore();

  const initNotificationsConfiguration = () => {
    const characterId = String(Game.hero.id);
    const allGuildIds = guilds?.map((guild) => guild.id) || [];

    const currentSettings = notificationsSettings[characterId];

    if (!currentSettings) {
      const recommendedNotificationsSettingsWithGuilds = Object.entries(
        recommendedNotificationsSettings,
      ).reduce((acc, [key, value]) => {
        acc[key as keyof NotificationsSettings] = {
          ...value,
          guildIds: allGuildIds,
        };
        return acc;
      }, {} as NotificationsSettings);

      setNotificationsSettings(
        characterId,
        recommendedNotificationsSettingsWithGuilds,
      );
      return;
    }

    const missingKeys = Object.keys(recommendedNotificationsSettings).filter(
      (key) => !(key in currentSettings),
    );

    if (missingKeys.length > 0) {
      const patched = { ...currentSettings };
      for (const key of missingKeys) {
        patched[key as keyof NotificationsSettings] = {
          ...recommendedNotificationsSettings[
            key as keyof NotificationsSettings
          ],
          guildIds: allGuildIds,
        };
      }
      setNotificationsSettings(characterId, patched);
    }
  };

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
        initNotificationsConfiguration();
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
          initNotificationsConfiguration();
          initDetectorConfiguration();
          configInitialized.current = true;
          clearInterval(interval);
        }
      }, HERO_ID_POLL_INTERVAL_MS);

      return () => clearInterval(interval);
    }
  }, [
    gameInitialized,
    guilds,
    initDetectorConfiguration,
    initNotificationsConfiguration,
  ]);
};
