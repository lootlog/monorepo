import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { MIN_NPC_WT, MIN_RESP_BASE_SECONDS } from "@/constants/margonem";
import { SpecialE2 } from "@/constants/special-e2";
import { Game } from "@/lib/game";
import { getNpcTypeByWt } from "@/utils/game/npcs/get-npc-type-by-wt";
import { getNpcTplFromEvent } from "@/utils/game/events/get-npc-tpl-from-event";
import type { GameEvent } from "@/types/margonem/game-events/game-event";
import {
  type GameNpcWithLocation,
  useNpcDetectorStore,
} from "@/store/npc-detector.store";
import type { EventHandlersConfig } from "./types";
import { useCreateTimer } from "@/hooks/api/use-create-timer";
import { useGlobalStore } from "@/store/global.store";
import { useWindowsStore } from "@/store/windows.store";
import { NpcType } from "@/hooks/api/use-npcs";
import {
  useLootlogCharactersConfig,
  type LootlogCharacterConfigResponse,
} from "@/hooks/api/use-lootlog-character-config";
import { gameEventsStore } from "@/store/game-store/game-events.store";

import { useGuilds } from "@/hooks/api/use-guilds";

export const useEventHandlers = (config: EventHandlersConfig) => {
  const { characterId, accountId, world } = useGlobalStore((s) => s.gameState);
  const { mutate: createTimer } = useCreateTimer();
  const { data: guilds } = useGuilds();
  const { addNpc, removeNpc } = useNpcDetectorStore();
  const { setOpen } = useWindowsStore();
  const { data: charactersConfig } = useLootlogCharactersConfig();

  const {
    isValidGameState,
    processNpcSettings,
    processGameNpcSettings,
    composeNpcFromEvent,
    composeNpcFromGame,
    processNpcActions,
    removeNotificationByNpcId,
    createLootFromBattle,
    handleUpdateLoot,
    isLootDistributionMessage,
  } = config;

  const handleNpcDetection = useCallback(
    (event: GameEvent) => {
      if (event.f?.init === "1" || !characterId) return;

      const npcs =
        event.npcs?.reduce<GameNpcWithLocation[]>((acc, npc) => {
          const tpl =
            getNpcTplFromEvent(event, npc.tpl) || Game.getNpcTpl(npc.tpl);
          if (!tpl) return acc;

          const npcType = getNpcTypeByWt(tpl.wt, tpl.prof, tpl.type);
          if (!processNpcSettings) return acc;

          const processedSettings = processNpcSettings(npc, npcType, event);
          if (!processedSettings) return acc;

          if (!composeNpcFromEvent || !processNpcActions) return acc;

          const composedNpc = composeNpcFromEvent(npc, tpl, processedSettings);

          processNpcActions(
            composedNpc,
            npcType,
            processedSettings.guildIds,
            processedSettings.autoSendMessage,
            processedSettings.autoSendNotification,
          );

          acc.push(composedNpc);
          return acc;
        }, []) ?? [];

      if (npcs.length > 0) {
        setOpen?.("npc-detector", true);
        addNpc?.(npcs);
      }
    },
    [
      characterId,
      processNpcSettings,
      composeNpcFromEvent,
      processNpcActions,
      setOpen,
      addNpc,
    ],
  );

  const handleInitialNpcsDetection = useCallback(() => {
    if (!characterId) return;

    const npcs = Game.npcs;
    const calculatedNpcs =
      npcs?.reduce<GameNpcWithLocation[]>((acc, npc) => {
        if (!npc) return acc;

        const npcType = getNpcTypeByWt(npc.wt, npc.prof, npc.type);
        if (!processGameNpcSettings) return acc;

        const processedSettings = processGameNpcSettings(npc, npcType);
        if (!processedSettings) return acc;

        if (!composeNpcFromGame || !processNpcActions) return acc;

        const composedNpc = composeNpcFromGame(npc, processedSettings);

        processNpcActions(
          composedNpc,
          npcType,
          processedSettings.guildIds,
          processedSettings.autoSendMessage,
          processedSettings.autoSendNotification,
        );

        acc.push(composedNpc);
        return acc;
      }, []) ?? [];

    if (calculatedNpcs.length > 0) {
      setOpen?.("npc-detector", true);
      addNpc?.(calculatedNpcs);
    }
  }, [
    characterId,
    processGameNpcSettings,
    composeNpcFromGame,
    processNpcActions,
    setOpen,
    addNpc,
  ]);

  const handleRespawnTimers = useCallback(
    (event: GameEvent) => {
      if (
        !isValidGameState ||
        !createTimer ||
        !removeNpc ||
        !removeNotificationByNpcId ||
        !guilds ||
        guilds.length === 0
      )
        return;

      event.npcs_del?.forEach((npc) => {
        const data = Game.getNpc(npc.id);
        if (!data || !npc.respBaseSeconds || !world || data.wt < MIN_NPC_WT)
          return;

        removeNpc(npc.id);
        removeNotificationByNpcId(npc.id, world);

        if (npc.respBaseSeconds < MIN_RESP_BASE_SECONDS) return;

        const map = Game.map.id;
        const elite2Name =
          SpecialE2[map as keyof typeof SpecialE2] || data.nick;
        const npcType = getNpcTypeByWt(data.wt, data.prof, data.type);
        const npcName = npcType === NpcType.ELITE2 ? elite2Name : data.nick;

        if (characterId && accountId && world) {
          const characterConfig = charactersConfig?.[characterId];
          const whitelistedGuildIds =
            characterConfig?.addTimersWhitelistGuildIds ?? [];

          const guildIds = guilds
            .filter((g) => whitelistedGuildIds.includes(g.id))
            .map((g) => g.id);

          if (guildIds.length === 0) return;

          const tempIds = guildIds.map(() => crypto.randomUUID());

          createTimer({
            timer: {
              respawnRandomness: data.resp_rand,
              respBaseSeconds: npc.respBaseSeconds,
              characterId,
              accountId,
              world,
              npc: {
                icon: data.icon,
                id: data.id,
                prof: data.prof,
                wt: data.wt,
                hpp: 0,
                type: data.type,
                lvl: data.lvl,
                name: npcName,
                location: Game.map.name,
              },
            },
            guildIds,
            tempIds,
            npcType,
          });
        }
      });
    },
    [
      isValidGameState,
      world,
      characterId,
      accountId,
      removeNpc,
      removeNotificationByNpcId,
      createTimer,
      guilds,
      charactersConfig,
    ],
  );

  const handleChatEvents = useCallback(
    (event: GameEvent) => {
      if (!handleUpdateLoot || !isLootDistributionMessage) return;

      const hasLootDistribution = event.chat?.channels?.system?.msg?.some(
        isLootDistributionMessage,
      );
      if (hasLootDistribution) {
        handleUpdateLoot(event);
      }
    },
    [isLootDistributionMessage, handleUpdateLoot],
  );

  const handleDialogEvents = useCallback((event: GameEvent) => {
    if (event.d?.[2]) {
      gameEventsStore.setTalkingNpcId(event.d[2]);
    }
  }, []);

  const handleBattleEvents = useCallback(
    (event: GameEvent) => {
      if (event.f?.w && event.f.init === "1") {
        gameEventsStore.setLatestLootId(null);
        gameEventsStore.setPendingBattle(event.f.w);
      }

      if (
        event.f?.endBattle === 1 &&
        event.item &&
        event.loot?.source === "fight"
      ) {
        gameEventsStore.setLatestLootId(null);
        createLootFromBattle?.(event);
      }
    },
    [createLootFromBattle],
  );

  return {
    handleNpcDetection,
    handleInitialNpcsDetection,
    handleRespawnTimers,
    handleChatEvents,
    handleDialogEvents,
    handleBattleEvents,
  };
};
