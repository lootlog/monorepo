import {
  composeNpcFromEvent,
  composeNpcFromGame,
} from "@/hooks/game-events/helpers/npc.helpers";
import type { EventNpc, ProcessedNpcSettings } from "@/hooks/game-events/types";
import { useMessagingHandlers } from "@/hooks/game-events/use-messaging-handlers";
import { useSoundPlayback } from "@/hooks/use-sound-playback";
import { Game } from "@/lib/game";
import {
  type DetectorNpcType,
  type GameNpcWithLocation,
  type NpcDetectorSettingByNpc,
  useNpcDetectorStore,
} from "@/store/npc-detector.store";
import { useWindowsStore } from "@/store/windows.store";
import type { GameEvent } from "@lootlog/margonem/game-events";
import type { GameNpc } from "@lootlog/margonem";
import { getNpcTypeByWt } from "@lootlog/types";
import { NpcType } from "@/hooks/api/use-npcs";
import { getNpcIconFromEvent } from "@/utils/game/events/get-npc-icon-from-event";
import { getNpcTplFromEvent } from "@/utils/game/events/get-npc-tpl-from-event";

export const useNpcsHandlers = () => {
  const { addNpc } = useNpcDetectorStore();
  const setOpen = useWindowsStore((state) => state.setOpen);
  const { handleSendMessage, handleSendNotification } = useMessagingHandlers();
  const { playSound } = useSoundPlayback();

  const handleNpcDetection = (event: GameEvent) => {
    if (!event.npcs?.length) return;
    if (event.f?.init === "1") return;

    const npcs =
      event.npcs?.reduce<GameNpcWithLocation[]>((acc, npc) => {
        const tpl =
          getNpcTplFromEvent(event, npc.tpl) || Game.getNpcTpl(npc.tpl);
        if (!tpl) return acc;

        const npcType = getNpcTypeByWt(
          NpcType,
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
          autoSendNotification: processedSettings.autoSendNotification,
          npcType,
          detectorSettings: processedSettings.settings,
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
          NpcType,
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
          autoSendNotification: processedSettings.autoSendNotification,
          npcType,
          detectorSettings: processedSettings.settings,
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

    const autoSendNotification = settings.autoNotifyClan ?? false;
    const guildIds = settings.guildIds ?? [];

    return {
      settings,
      icon,
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

    const autoSendNotification = settings.autoNotifyClan ?? false;
    const guildIds = settings.guildIds ?? [];

    return {
      settings,
      icon,
      autoSendNotification,
      guildIds,
    };
  };

  const sendNotification = ({
    composedNpc,
    guildIds,
    autoSendNotification,
    npcType,
    detectorSettings,
  }: {
    composedNpc: GameNpcWithLocation;
    guildIds: string[];
    autoSendNotification: boolean;
    npcType: DetectorNpcType;
    detectorSettings: NpcDetectorSettingByNpc;
  }) => {
    if (autoSendNotification) {
      handleSendNotification(composedNpc, guildIds);
      handleSendMessage(guildIds, composedNpc);
    }

    if (detectorSettings.notifySound) {
      playSound("detector", npcType);
    }
  };

  return {
    handleNpcDetection,
    handleInitialNpcsDetection,
  };
};
