import type { NpcType } from "@/hooks/api/use-npcs";
import {
  composeNpcFromEvent,
  composeNpcFromGame,
} from "@/hooks/game-events/helpers/npc.helpers";
import type { EventNpc, ProcessedNpcSettings } from "@/hooks/game-events/types";
import { useMessagingHandlers } from "@/hooks/game-events/use-messaging-handlers";
import { Game } from "@/lib/game";
import {
  type DetectorNpcType,
  type GameNpcWithLocation,
  useNpcDetectorStore,
} from "@/store/npc-detector.store";
import { useWindowsStore } from "@/store/windows.store";
import type { GameEvent } from "@/types/margonem/game-events/game-event";
import type { GameNpc } from "@/types/margonem/npcs";
import { getNpcIconFromEvent } from "@/utils/game/events/get-npc-icon-from-event";
import { getNpcTplFromEvent } from "@/utils/game/events/get-npc-tpl-from-event";
import { getNpcTypeByWt } from "@/utils/game/npcs/get-npc-type-by-wt";

export const useNpcsHandlers = () => {
  const { addNpc } = useNpcDetectorStore();
  const { setOpen } = useWindowsStore();
  const { handleSendMessage, handleSendNotification } = useMessagingHandlers();

  const handleNpcDetection = (event: GameEvent) => {
    if (!event.npcs?.length) return;
    if (event.f?.init === "1") return;

    const npcs =
      event.npcs?.reduce<GameNpcWithLocation[]>((acc, npc) => {
        const tpl =
          getNpcTplFromEvent(event, npc.tpl) || Game.getNpcTpl(npc.tpl);
        if (!tpl) return acc;

        const npcType = getNpcTypeByWt(
          tpl.wt,
          tpl.prof,
          tpl.type,
        ) as DetectorNpcType;

        const processedSettings = processNpcSettings(npc, npcType, event);
        if (!processedSettings) return acc;

        const composedNpc = composeNpcFromEvent(npc, tpl, processedSettings);

        sendNotification({
          composedNpc,
          guildIds: processedSettings.guildIds,
          autoSendMessage: processedSettings.autoSendMessage,
          autoSendNotification: processedSettings.autoSendNotification,
        });

        acc.push(composedNpc);
        return acc;
      }, []) ?? [];

    if (npcs.length > 0) {
      setOpen("npc-detector", true);
      addNpc(npcs);
    }
  };

  const handleInitialNpcsDetection = () => {
    const npcs = Game.npcs;

    const calculatedNpcs =
      npcs?.reduce<GameNpcWithLocation[]>((acc, npc) => {
        if (!npc) return acc;

        const npcType = getNpcTypeByWt(
          npc.wt,
          npc.prof,
          npc.type,
        ) as DetectorNpcType;

        const processedSettings = processGameNpcSettings(npc, npcType);
        if (!processedSettings) return acc;

        const composedNpc = composeNpcFromGame(npc, processedSettings);

        sendNotification({
          composedNpc,
          guildIds: processedSettings.guildIds,
          autoSendMessage: processedSettings.autoSendMessage,
          autoSendNotification: processedSettings.autoSendNotification,
        });

        acc.push(composedNpc);
        return acc;
      }, []) ?? [];

    if (calculatedNpcs.length > 0) {
      setOpen("npc-detector", true);
      addNpc(calculatedNpcs);
    }
  };

  const processNpcSettings = (
    npc: EventNpc,
    npcType: DetectorNpcType,
    event?: GameEvent,
  ): ProcessedNpcSettings | null => {
    const characterId = Game.hero.id;
    const detectorSettings = useNpcDetectorStore.getState().settings;

    const settings = detectorSettings[characterId]?.[npcType];
    if (!settings?.detect) return null;

    const icon = event
      ? getNpcIconFromEvent(event, npc.icon.id) ||
        Game.getNpcIcon(npc.icon.id) ||
        ""
      : Game.getNpcIcon(npc.icon.id) || "";

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
  };

  const processGameNpcSettings = (
    npc: GameNpc,
    npcType: DetectorNpcType,
  ): ProcessedNpcSettings | null => {
    const characterId = Game.hero.id;

    const detectorSettings = useNpcDetectorStore.getState().settings;
    const settings = detectorSettings[characterId]?.[npcType];

    if (!settings?.detect) return null;

    const icon = Game.getNpcIcon(npc.tpl) || npc.icon || "";

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
  };

  const sendNotification = ({
    composedNpc,
    guildIds,
    autoSendMessage,
    autoSendNotification,
  }: {
    composedNpc: GameNpcWithLocation;
    guildIds: string[];
    autoSendMessage: boolean;
    autoSendNotification: boolean;
  }) => {
    if (autoSendMessage) {
      handleSendMessage(guildIds, composedNpc);
    }

    if (autoSendNotification) {
      handleSendNotification(composedNpc, guildIds);
    }
  };

  return {
    handleNpcDetection,
    handleInitialNpcsDetection,
  };
};
