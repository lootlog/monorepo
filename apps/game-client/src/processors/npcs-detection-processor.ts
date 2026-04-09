import {
  composeNpcFromEvent,
  composeNpcFromGame,
} from "@/hooks/game-events/helpers/npc.helpers";
import type { EventNpc, ProcessedNpcSettings } from "@/hooks/game-events/types";
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
import {
  sendChatMessage,
  createNotification,
  MessageType,
} from "@/services/api.service";
import { playSound } from "@/lib/sound-playback";

export class NpcsDetectionProcessor {
  handle(event: GameEvent): void {
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

        const processedSettings = this.processNpcSettings(npc, npcType, event);
        if (!processedSettings) return acc;

        const composedNpc = composeNpcFromEvent(npc, tpl, processedSettings);

        this.sendNotification({
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
      useWindowsStore.getState().setOpen("npc-detector", true);
      useNpcDetectorStore.getState().addNpc(npcs);
    }
  }

  handleInitialDetection(): void {
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

        const processedSettings = this.processGameNpcSettings(npc, npcType);
        if (!processedSettings) return acc;

        const composedNpc = composeNpcFromGame(npc, processedSettings);

        this.sendNotification({
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
      useWindowsStore.getState().setOpen("npc-detector", true);
      useNpcDetectorStore.getState().addNpc(calculatedNpcs);
    }
  }

  private processNpcSettings(
    npc: EventNpc,
    npcType: DetectorNpcType,
    event?: GameEvent,
  ): ProcessedNpcSettings | null {
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
  }

  private processGameNpcSettings(
    npc: GameNpc,
    npcType: DetectorNpcType,
  ): ProcessedNpcSettings | null {
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
  }

  private sendNotification({
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
  }): void {
    if (autoSendNotification) {
      const world = Game.getWorldName();

      createNotification({
        npc: {
          id: composedNpc.id,
          hpp: 0,
          location: composedNpc.location,
          name: composedNpc.nick,
          wt: composedNpc.wt,
          lvl: composedNpc.lvl,
          prof: composedNpc.prof,
          icon: composedNpc.icon,
          type: composedNpc.type,
        },
        world,
        guildIds,
      }).catch((error) => {
        console.warn(
          "[NpcsDetectionProcessor] Failed to send notification:",
          error,
        );
      });

      sendChatMessage({
        message: "",
        guildIds,
        type: MessageType.NPC,
        characterData: {
          nick: Game.hero.nick,
          id: Game.hero.id,
          acc: Game.hero.account,
          lvl: Game.hero.lvl,
          prof: Game.hero.prof,
          icon: Game.hero.img,
        },
        npc: {
          x: composedNpc.x,
          y: composedNpc.y,
          icon: composedNpc.icon,
          id: composedNpc.id,
          name: composedNpc.nick,
          lvl: composedNpc.lvl,
          prof: composedNpc.prof,
          type: composedNpc.type,
          hpp: 0,
          location: composedNpc.location,
          wt: composedNpc.wt,
        },
      })
        .then(() => {
          useWindowsStore.getState().setOpen("npc-detector", true);
        })
        .catch((error) => {
          console.warn(
            "[NpcsDetectionProcessor] Failed to send chat message:",
            error,
          );
        });
    }

    if (detectorSettings.notifySound) {
      playSound("detector", npcType);
    }
  }
}
