import { useCallback } from "react";
import { NpcType } from "@/hooks/api/use-npcs";
import { Game } from "@/lib/game";
import { getNpcIconFromEvent } from "@/utils/game/events/get-npc-icon-from-event";
import { GameEvent } from "@/types/margonem/game-events/game-event";
import { PickedNpcType } from "@/store/npc-detector.store";
import { ProcessedNpcSettings, NpcProcessorsConfig } from "./types";

const isPickedNpcType = (npcType: NpcType): npcType is PickedNpcType => {
  return [NpcType.HERO, NpcType.COLOSSUS, NpcType.TITAN, NpcType.ELITE2].includes(npcType as PickedNpcType);
};

export const useNpcProcessors = (config: NpcProcessorsConfig) => {
  const { settingsRef, handleSendMessage, handleSendNotification, characterId } = config;
  const processNpcSettings = useCallback(
    (
      npc: any,
      npcType: NpcType,
      event?: GameEvent
    ): ProcessedNpcSettings | null => {
      if (!characterId || !isPickedNpcType(npcType)) return null;

      const settings = settingsRef.current[characterId]?.[npcType];
      if (!settings?.detect) return null;

      const icon = event
        ? getNpcIconFromEvent(event, npc.icon?.id) ||
          Game.getNpcIcon(npc.icon?.id)
        : npc.icon || "";

      const autoSendMessage = settings.autoNotifyChat ?? false;
      const autoSendNotification = settings.autoNotifyClan ?? false;
      const guildIds = settings.guildIds ?? [];

      return {
        settings,
        icon,
        autoSendMessage,
        autoSendNotification,
        guildIds,
      };
    },
    [characterId]
  );

  const composeNpcFromEvent = useCallback(
    (npc: any, tpl: any, processedSettings: ProcessedNpcSettings) => ({
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
    []
  );

  const composeNpcFromGame = useCallback(
    (npc: any, processedSettings: ProcessedNpcSettings) => ({
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
    []
  );

  const processNpcActions = useCallback(
    (
      composedNpc: any,
      npcType: NpcType,
      guildIds: string[],
      autoSendMessage: boolean,
      autoSendNotification: boolean
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
          guildIds
        );
      }

      if (autoSendNotification) {
        handleSendNotification(composedNpc, guildIds);
      }
    },
    [handleSendMessage, handleSendNotification]
  );

  return {
    processNpcSettings,
    composeNpcFromEvent,
    composeNpcFromGame,
    processNpcActions,
  };
};
