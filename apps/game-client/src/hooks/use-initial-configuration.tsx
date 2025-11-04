import { useCharacterList } from "@/hooks/api/use-character-list";
import { getAccountId } from "@/lib/game/get-account-id";
import { getCharacterId } from "@/lib/game/get-character-id";
import { getInitializeState } from "@/lib/game/get-initialize-state";
import { getInterfaceName } from "@/lib/game/get-interface-name";
import { getWorldName } from "@/lib/game/get-world-name";
import { useGlobalStore } from "@/store/global.store";
import {
  type NotificationsSettings,
  recommendedSettings as recommendedNotificationsSettings,
  useNotificationsStore,
} from "@/store/notifications.store";
import {
  recommendedSettings as recommendedDetectorSettings,
  useNpcDetectorStore,
} from "@/store/npc-detector.store";
import { getLanguageVersion } from "@/utils/game/get-language-version";
import { gameEventsManager } from "@/lib/game-events-manager";
import { useEffect, useEffectEvent, useRef } from "react";
import { useGuilds } from "@/hooks/api/use-guilds";

export const useInitialConfiguration = () => {
  const { setGameState, gameState } = useGlobalStore();
  const { setSettings: setDetectorSettings, settings: detectorSettings } =
    useNpcDetectorStore();
  const { settings: notificationsSettings, setState: setNotificationsState } =
    useNotificationsStore();
  const { data: guilds } = useGuilds();
  const { data: characterList } = useCharacterList();
  const initializationRef = useRef({
    initialized: false,
    timeoutId: null as NodeJS.Timeout | null,
  });

  const scheduleInitCheck = useEffectEvent(() => {
    if (initializationRef.current.timeoutId) {
      clearTimeout(initializationRef.current.timeoutId);
    }

    initializationRef.current.timeoutId = setTimeout(() => {
      checkAndInitialize();
    }, 0);
  });

  const checkAndInitialize = () => {
    if (initializationRef.current.initialized) {
      return;
    }

    const interfaceName = getInterfaceName();
    const initialized = getInitializeState(interfaceName);

    if (!initialized) {
      return;
    }

    initializationRef.current.initialized = true;

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

    gameEventsManager.setReady(true);
  };

  const initDetectorConfiguration = (characterId: string) => {
    if (!detectorSettings[characterId]) {
      setDetectorSettings(characterId, recommendedDetectorSettings);
    }
  };

  const initNotificationsConfiguration = useEffectEvent(
    (characterId: string) => {
      if (!notificationsSettings[characterId]) {
        const recommendedNotificationsSettingsWithGuilds = Object.entries(
          recommendedNotificationsSettings,
        ).reduce((acc, [key, value]) => {
          acc[key as keyof NotificationsSettings] = {
            ...value,
            guildIds: guilds?.map((guild) => guild.id) || [],
          };
          return acc;
        }, {} as NotificationsSettings);

        setNotificationsState({
          ...notificationsSettings,
          [characterId]: recommendedNotificationsSettingsWithGuilds,
        });
      }
    },
  );

  useEffect(() => {
    const init = initializationRef;

    gameEventsManager.setupProxies();

    gameEventsManager.setGameInitCallback(() => {
      if (!init.current.initialized) {
        scheduleInitCheck();
      }
    });

    return () => {
      gameEventsManager.cleanup();
      const timeoutId = init.current.timeoutId;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, []);

  useEffect(() => {
    if (
      gameState.characterId &&
      gameState.gameInitialized &&
      characterList &&
      guilds
    ) {
      initNotificationsConfiguration(gameState.characterId);
    }
  }, [gameState.characterId, gameState.gameInitialized, characterList, guilds]);
};
