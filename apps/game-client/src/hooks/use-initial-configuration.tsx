import { useCharacterList } from "@/hooks/api/use-character-list";
import { useGuilds } from "@/hooks/api/use-guilds";
import { getAccountId } from "@/lib/game/get-account-id";
import { getCharacterId } from "@/lib/game/get-character-id";
import { getInitializeState } from "@/lib/game/get-initialize-state";
import { getInterfaceName } from "@/lib/game/get-interface-name";
import { getWorldName } from "@/lib/game/get-world-name";
import { useGlobalStore } from "@/store/global.store";
import {
  NotificationsSettings,
  recommendedSettings as recommendedNotificationsSettings,
  useNotificationsStore,
} from "@/store/notifications.store";
import {
  recommendedSettings as recommendedDetectorSettings,
  useNpcDetectorStore,
} from "@/store/npc-detector.store";
import { getLanguageVersion } from "@/utils/game/get-language-version";
import { isEmpty } from "lodash";
import { useEffect } from "react";

export const useInitialConfiguration = () => {
  const { setGameState, gameState } = useGlobalStore();
  const { setSettings: setDetectorSettings, settings: detectorSettings } =
    useNpcDetectorStore();
  const { settings: notificationsSettings, setState: setNotificationsState } =
    useNotificationsStore();
  const { data: guilds } = useGuilds();
  const { data: characterList } = useCharacterList();

  const init = async () => {
    const started = typeof window._g == "function";
    if (!started) {
      setTimeout(init, 500);
      return;
    }

    const interfaceName = getInterfaceName();
    const initialized = getInitializeState(interfaceName);

    if (!initialized) {
      setTimeout(init, 500);
      return;
    }

    const world = getWorldName(interfaceName);
    const accountId = getAccountId(interfaceName);
    const characterId = getCharacterId(interfaceName);
    const languageVersion = getLanguageVersion(window.location.href);

    initDetectorConfiguration(characterId);

    setGameState({
      gameInitialized: true,
      gameInterface: interfaceName,
      world,
      accountId,
      characterId,
      languageVersion,
    });
  };

  const initDetectorConfiguration = (characterId: string) => {
    if (!detectorSettings[characterId]) {
      setDetectorSettings(characterId, recommendedDetectorSettings);
    }
  };

  const initNotificationsConfiguration = () => {
    if (isEmpty(notificationsSettings)) {
      const recommendedNotificationsSettingsWithGuilds = Object.entries(
        recommendedNotificationsSettings
      ).reduce((acc, [key, value]) => {
        acc[key as keyof NotificationsSettings] = {
          ...value,
          guildIds: guilds?.map((guild) => guild.id) || [],
        };
        return acc;
      }, {} as NotificationsSettings);

      const charactersSettings = characterList?.reduce(
        (acc, character) => {
          acc[character.id] = recommendedNotificationsSettingsWithGuilds;
          return acc;
        },
        {} as Record<string, NotificationsSettings>
      );

      setNotificationsState(charactersSettings || {});
    }
  };

  useEffect(() => {
    init();
  }, []);

  useEffect(() => {
    if (
      gameState.characterId &&
      gameState.gameInitialized &&
      characterList &&
      guilds
    ) {
      initNotificationsConfiguration();
    }
  }, [gameState.characterId, gameState.gameInitialized, characterList, guilds]);
};
