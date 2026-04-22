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
import { NpcType } from "@/api/npcs.api";
import { getNpcIconFromEvent } from "@/utils/game/events/get-npc-icon-from-event";
import { getNpcTplFromEvent } from "@/utils/game/events/get-npc-tpl-from-event";
import {
  getNpcTypeByWt,
  type DetectorNpcType,
  type DetectorSettings,
  type DetectorTypeSettings,
  type UserGameAccountPreferences,
} from "@lootlog/types";
import { sendChatMessage, createNotification, MessageType } from "@/api";
import {
  buildNpcChatMessagePayload,
  buildNpcNotificationPayload,
  resolveNpcNotificationRouting,
} from "@/utils/notifications-and-detector/npc-notification";
import { playSound } from "@/lib/sound-playback";
import { queryClient } from "@/lib/query-client";
import {
  getEffectiveDetectorSettings,
  getUserGameAccountPreferencesQueryKey,
} from "@/lib/game-account-preferences";

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

    const { guildIds } = resolveNpcNotificationRouting({
      routingRules: detectorSettings.routingRules,
      npcLevel,
    });
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
    const { guildIds } = resolveNpcNotificationRouting({
      routingRules: detectorSettings.routingRules,
      npcLevel: npc.lvl,
    });
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
      void this.autoSendNpcNotification(composedNpc, guildIds);
    }

    if (detectorSettings.notifySound) {
      playSound("detector", npcType);
    }
  }

  private async autoSendNpcNotification(
    npc: GameNpcWithLocation,
    guildIds: string[],
  ): Promise<void> {
    try {
      const notificationResponse = await createNotification(
        buildNpcNotificationPayload({
          npc,
          guildIds,
        }),
      );
      const resolvedGuildIds = notificationResponse?.guildIds ?? guildIds;

      useNpcDetectorStore.getState().setNpcState(npc.id, {
        ...npc,
        notificationSent: true,
      });

      try {
        await sendChatMessage(
          buildNpcChatMessagePayload({
            npc,
            guildIds: resolvedGuildIds,
            messageType: MessageType.NPC,
          }),
        );
        useWindowsStore.getState().setOpen("npc-detector", true);
      } catch (error) {
        console.warn(
          "[NpcsDetectionProcessor] Failed to send chat message:",
          error,
        );
      }
    } catch (error) {
      console.warn(
        "[NpcsDetectionProcessor] Failed to send notification:",
        error,
      );
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
    const queryKey = getUserGameAccountPreferencesQueryKey(accountId);
    const preferences =
      queryClient.getQueryData<UserGameAccountPreferences>(queryKey);
    const queryState = queryClient.getQueryState<
      UserGameAccountPreferences,
      Error
    >(queryKey);

    if (preferences) {
      return true;
    }

    return queryState?.status === "error";
  }
}

export const npcsDetectionProcessor = new NpcsDetectionProcessor();
