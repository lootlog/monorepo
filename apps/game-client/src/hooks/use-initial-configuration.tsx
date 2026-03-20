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

    const currentSettings = notificationsSettings[characterId];

    console.warn(
      "[initNotificationsConfiguration] characterId:",
      characterId,
      "allGuildIds:",
      allGuildIds,
      "currentSettings:",
      currentSettings,
    );

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

      console.warn(
        "[initNotificationsConfiguration] No existing settings, applying recommended:",
        recommendedNotificationsSettingsWithGuilds,
      );

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
      console.warn(
        "[initNotificationsConfiguration] Patching missing keys:",
        missingKeys,
      );

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
    } else {
      console.warn(
        "[initNotificationsConfiguration] Settings up to date, no patching needed",
      );
    }
  };

  const initDetectorConfiguration = () => {
    const characterId = String(Game.hero.id);
    const currentSettings = detectorSettings[characterId];

    console.warn(
      "[initDetectorConfiguration] characterId:",
      characterId,
      "currentSettings:",
      currentSettings,
    );

    if (!currentSettings) {
      console.warn(
        "[initDetectorConfiguration] No existing settings, applying recommended:",
        recommendedDetectorSettings,
      );
      setDetectorSettings(characterId, recommendedDetectorSettings);
    } else {
      console.warn(
        "[initDetectorConfiguration] Settings already exist, skipping",
      );
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
