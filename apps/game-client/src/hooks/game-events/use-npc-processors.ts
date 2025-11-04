import { useCallback } from "react";
import { Game } from "@/lib/game";
import { getNpcIconFromEvent } from "@/utils/game/events/get-npc-icon-from-event";
import { GameEvent } from "@/types/margonem/game-events/game-event";
import {
  PickedNpcType,
  GameNpcWithLocation,
  useNpcDetectorStore,
} from "@/store/npc-detector.store";
import { GameNpc } from "@/types/margonem/npcs";
import { NpcTpl } from "@/types/margonem/npc-tpl-manager";
import { ProcessedNpcSettings, NpcProcessorsConfig, EventNpc } from "./types";
import { useGlobalStore } from "@/store/global.store";
import { NpcType } from "@/hooks/api/use-npcs";

const isPickedNpcType = (npcType: NpcType): npcType is PickedNpcType => {
  return [
    NpcType.HERO,
    NpcType.COLOSSUS,
    NpcType.TITAN,
    NpcType.ELITE2,
  ].includes(npcType as PickedNpcType);
};

export const useNpcProcessors = (config: NpcProcessorsConfig) => {
  const { characterId } = useGlobalStore((s) => s.gameState);
  const { settings } = useNpcDetectorStore();

  const { handleSendMessage, handleSendNotification } = config;
  const processNpcSettings = useCallback(
    (
      npc: EventNpc,
      npcType: NpcType,
      event?: GameEvent,
    ): ProcessedNpcSettings | null => {
      if (!characterId || !isPickedNpcType(npcType)) return null;

      const npcSettings = settings[characterId]?.[npcType];
      if (!npcSettings?.detect) return null;

      const icon = event
        ? getNpcIconFromEvent(event, npc.icon.id) ||
          Game.getNpcIcon(npc.icon.id) ||
          ""
        : Game.getNpcIcon(npc.icon.id) || "";

      const autoSendMessage = npcSettings.autoNotifyChat ?? false;
      const autoSendNotification = npcSettings.autoNotifyClan ?? false;
      const guildIds = npcSettings.guildIds ?? [];

      return {
        settings: npcSettings,
        icon,
        autoSendMessage,
        autoSendNotification,
        guildIds,
      };
    },
    [characterId, settings],
  );

  const processGameNpcSettings = useCallback(
    (npc: GameNpc, npcType: NpcType): ProcessedNpcSettings | null => {
      if (!characterId || !isPickedNpcType(npcType)) return null;

      const npcSettings = settings[characterId]?.[npcType];
      if (!npcSettings?.detect) return null;

      const icon = Game.getNpcIcon(npc.tpl) || npc.icon || "";

      const autoSendMessage = npcSettings.autoNotifyChat ?? false;
      const autoSendNotification = npcSettings.autoNotifyClan ?? false;
      const guildIds = npcSettings.guildIds ?? [];

      return {
        settings: npcSettings,
        icon,
        autoSendMessage,
        autoSendNotification,
        guildIds,
      };
    },
    [characterId, settings],
  );

  const composeNpcFromEvent = useCallback(
    (
      npc: EventNpc,
      tpl: NpcTpl,
      processedSettings: ProcessedNpcSettings,
    ): GameNpcWithLocation => ({
      ...npc,
      icon: processedSettings.icon,
      nick: tpl.nick,
      prof: tpl.prof,
      wt: tpl.wt,
      lvl: tpl.lvl,
      type: tpl.type,
      location: Game.map.name,
      notificationSent: processedSettings.autoSendNotification,
      msgSent: processedSettings.autoSendMessage,
    }),
    [],
  );

  const composeNpcFromGame = useCallback(
    (
      npc: GameNpc,
      processedSettings: ProcessedNpcSettings,
    ): GameNpcWithLocation => ({
      ...npc,
      icon: processedSettings.icon,
      nick: npc.nick,
      prof: npc.prof,
      wt: npc.wt,
      lvl: npc.lvl,
      type: npc.type,
      location: Game.map.name,
      notificationSent: processedSettings.autoSendNotification,
      msgSent: processedSettings.autoSendMessage,
    }),
    [],
  );

  const processNpcActions = useCallback(
    (
      composedNpc: GameNpcWithLocation,
      npcType: NpcType,
      guildIds: string[],
      autoSendMessage: boolean,
      autoSendNotification: boolean,
    ) => {
      if (autoSendMessage) {
        handleSendMessage(
          npcType,
          `${composedNpc.nick} (${composedNpc.lvl}${composedNpc.prof})`,
          {
            name: composedNpc.location,
            x: composedNpc.x,
            y: composedNpc.y,
          },
          guildIds,
        );
      }

      if (autoSendNotification) {
        handleSendNotification(composedNpc, guildIds);
      }
    },
    [handleSendMessage, handleSendNotification],
  );

  return {
    processNpcSettings,
    processGameNpcSettings,
    composeNpcFromEvent,
    composeNpcFromGame,
    processNpcActions,
  };
};
