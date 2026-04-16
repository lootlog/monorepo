import {
  composeNpcFromEvent,
  composeNpcFromGame,
} from "@/hooks/game-events/helpers/npc.helpers";
import type { EventNpc, ProcessedNpcSettings } from "@/hooks/game-events/types";
import { Game } from "@/lib/game";
import {
  type GameNpcWithLocation,
  useNpcDetectorStore,
} from "@/store/npc-detector.store";
import { useWindowsStore } from "@/store/windows.store";
import type { GameEvent } from "@lootlog/margonem/game-events";
import type { GameNpc } from "@lootlog/margonem";
import { getNpcTypeByWt } from "@lootlog/types";
import { NpcType } from "@/hooks/api/use-npcs";
import { getNpcIconFromEvent } from "@/utils/game/events/get-npc-icon-from-event";
import { getNpcTplFromEvent } from "@/utils/game/events/get-npc-tpl-from-event";
import type {
  DetectorNpcType,
  DetectorSettings,
  DetectorTypeSettings,
  UserGameAccountPreferences,
} from "@lootlog/types";
import {
  sendChatMessage,
  createNotification,
  MessageType,
} from "@/services/api.service";
import { playSound } from "@/lib/sound-playback";
import { queryClient } from "@/lib/query-client";
import {
  getEffectiveDetectorSettings,
  isDetectorPreferencesReady,
  getUserGameAccountPreferencesQueryKey,
  resolveDetectorGuildIds,
} from "@/lib/game-account-notification-preferences";

type PendingDetection =
  | {
      accountId: string;
      type: "event";
      event: GameEvent;
    }
  | {
      accountId: string;
      type: "initial";
    };

export class NpcsDetectionProcessor {
  private static pendingDetections: PendingDetection[] = [];

  handle(event: GameEvent): void {
    const accountId = this.getCurrentAccountId();
    if (!accountId) return;
    if (!this.isDetectorReady(accountId)) {
      NpcsDetectionProcessor.pendingDetections.push({
        accountId,
        type: "event",
        event,
      });
      return;
    }

    this.processEvent(event);
  }

  handleInitialDetection(): void {
    const accountId = this.getCurrentAccountId();
    if (!accountId) return;
    if (!this.isDetectorReady(accountId)) {
      const hasQueuedInitialDetection =
        NpcsDetectionProcessor.pendingDetections.some(
          (pendingDetection) =>
            pendingDetection.accountId === accountId &&
            pendingDetection.type === "initial",
        );

      if (!hasQueuedInitialDetection) {
        NpcsDetectionProcessor.pendingDetections.push({
          accountId,
          type: "initial",
        });
      }
      return;
    }

    this.processInitialDetection();
  }

  flushPending(accountId: string): void {
    if (!this.isDetectorReady(accountId)) {
      return;
    }

    const pendingDetections = NpcsDetectionProcessor.pendingDetections.filter(
      (pendingDetection) => pendingDetection.accountId === accountId,
    );

    if (pendingDetections.length === 0) {
      return;
    }

    NpcsDetectionProcessor.pendingDetections =
      NpcsDetectionProcessor.pendingDetections.filter(
        (pendingDetection) => pendingDetection.accountId !== accountId,
      );

    pendingDetections.forEach((pendingDetection) => {
      if (pendingDetection.type === "initial") {
        this.processInitialDetection();
        return;
      }

      this.processEvent(pendingDetection.event);
    });
  }

  private processEvent(event: GameEvent): void {
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

        const processedSettings = this.processNpcSettings(
          npc,
          npcType,
          tpl.lvl,
          event,
        );
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
      useNpcDetectorStore.getState().addNpc(npcs, {
        highlightOnExisting: true,
      });
    }
  }

  private processInitialDetection(): void {
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
    npcLevel: number,
    event?: GameEvent,
  ): ProcessedNpcSettings | null {
    const detectorSettings = this.getDetectorSettings();
    const settings = detectorSettings[npcType];
    if (!settings?.detect) return null;

    const icon = event
      ? getNpcIconFromEvent(event, npc.icon.id) ||
        Game.getNpcIcon(npc.icon.id) ||
        ""
      : Game.getNpcIcon(npc.icon.id) || "";

    const guildIds = resolveDetectorGuildIds(
      detectorSettings.routingRules,
      npcLevel,
    );
    const autoSendNotification = settings.autoSend && guildIds.length > 0;

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
    const detectorSettings = this.getDetectorSettings();
    const settings = detectorSettings[npcType];

    if (!settings?.detect) return null;

    const icon = Game.getNpcIcon(npc.tpl) || npc.icon || "";

    const guildIds = resolveDetectorGuildIds(
      detectorSettings.routingRules,
      npc.lvl,
    );
    const autoSendNotification = settings.autoSend && guildIds.length > 0;

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
    detectorSettings: DetectorTypeSettings;
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

  private getDetectorSettings(): DetectorSettings {
    const accountId = this.getCurrentAccountId();
    if (!accountId) {
      return getEffectiveDetectorSettings();
    }

    const preferences = queryClient.getQueryData<UserGameAccountPreferences>(
      getUserGameAccountPreferencesQueryKey(accountId),
    );

    return getEffectiveDetectorSettings(preferences);
  }

  private getCurrentAccountId() {
    return Game.hero?.account ? String(Game.hero.account) : null;
  }

  private isDetectorReady(accountId: string) {
    const preferences = queryClient.getQueryData<UserGameAccountPreferences>(
      getUserGameAccountPreferencesQueryKey(accountId),
    );

    return isDetectorPreferencesReady(preferences);
  }
}

export const npcsDetectionProcessor = new NpcsDetectionProcessor();
