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

    if (!notificationsSettings[characterId]) {
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

    const existing = notificationsSettings[characterId];
    const missingKeys = Object.keys(recommendedNotificationsSettings).filter(
      (key) => !(key in existing),
    );

    if (missingKeys.length > 0) {
      const patched = { ...existing };
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

    if (!detectorSettings[characterId]) {
      setDetectorSettings(characterId, recommendedDetectorSettings);
    }
  };

  useEffect(() => {
    if (configInitialized.current) return;

    if (gameInitialized && guilds) {
      initNotificationsConfiguration();
      initDetectorConfiguration();
      configInitialized.current = true;
    }
  }, [
    gameInitialized,
    guilds,
    initDetectorConfiguration,
    initNotificationsConfiguration,
  ]);
};
