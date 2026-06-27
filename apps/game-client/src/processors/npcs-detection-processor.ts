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
import type { GameNpc } from "@lootlog/margonem/npcs";
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

type DetectionProcessingContext = {
  detectorSettings: DetectorSettings;
  routedGuildIdsByLevel: Map<number, string[]>;
};

// TODO: Temporary startup workaround. Replace this polling with an explicit
// NPC-ready signal from the game runtime; retry-based readiness checks are
// brittle and should not become our long-term pattern.
const INITIAL_DETECTION_RETRY_DELAY_MS = 100;
const INITIAL_DETECTION_MAX_RETRIES = 20;

type InitialDetectionSnapshot = {
  npcs: GameNpc[];
};

export class NpcsDetectionProcessor {
  private static pendingDetections: PendingDetection[] = [];
  private initialDetectionRetryTimeout: ReturnType<typeof setTimeout> | null =
    null;
  private initialDetectionRetryAttempts = 0;

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

    const detectorReady = this.isDetectorReady(accountId);

    if (!detectorReady) {
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

    this.processInitialDetectionWithRetry();
  }

  flushPending(accountId: string): void {
    const detectorReady = this.isDetectorReady(accountId);

    if (!detectorReady) {
      return;
    }

    const pendingDetections: PendingDetection[] = [];
    const remainingDetections: PendingDetection[] = [];

    for (const pendingDetection of NpcsDetectionProcessor.pendingDetections) {
      if (pendingDetection.accountId === accountId) {
        pendingDetections.push(pendingDetection);
        continue;
      }

      remainingDetections.push(pendingDetection);
    }

    if (pendingDetections.length === 0) {
      return;
    }

    NpcsDetectionProcessor.pendingDetections = remainingDetections;

    pendingDetections.forEach((pendingDetection) => {
      if (pendingDetection.type === "initial") {
        this.processInitialDetectionWithRetry();
        return;
      }

      this.processEvent(pendingDetection.event);
    });
  }

  private processEvent(event: GameEvent): void {
    if (!event.npcs?.length) {
      return;
    }

    if (event.f?.init === "1") {
      return;
    }

    const context = this.createDetectionContext();
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
          context,
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

  private processInitialDetectionWithRetry(): void {
    if (this.initialDetectionRetryTimeout !== null) {
      return;
    }

    this.initialDetectionRetryAttempts = 0;
    this.tryProcessInitialDetection();
  }

  private tryProcessInitialDetection(): void {
    const snapshot = this.getInitialDetectionSnapshot();
    const { npcs } = snapshot;

    if (npcs.length > 0) {
      this.clearInitialDetectionRetry();
      this.processInitialDetection(npcs);
      return;
    }

    if (this.initialDetectionRetryAttempts >= INITIAL_DETECTION_MAX_RETRIES) {
      this.clearInitialDetectionRetry();
      return;
    }

    this.initialDetectionRetryAttempts += 1;
    this.initialDetectionRetryTimeout = setTimeout(() => {
      this.initialDetectionRetryTimeout = null;
      this.tryProcessInitialDetection();
    }, INITIAL_DETECTION_RETRY_DELAY_MS);
  }

  private getInitialDetectionSnapshot(): InitialDetectionSnapshot {
    try {
      const rawNpcs = (Game.npcs ?? []) as Array<GameNpc | null | undefined>;
      const npcs = rawNpcs.filter((npc): npc is GameNpc =>
        this.isInitialDetectionNpcReady(npc),
      );

      return {
        npcs,
      };
    } catch {
      return {
        npcs: [],
      };
    }
  }

  private isInitialDetectionNpcReady(
    npc: GameNpc | null | undefined,
  ): npc is GameNpc {
    return (
      npc !== null &&
      npc !== undefined &&
      typeof npc.id === "number" &&
      typeof npc.tpl === "number" &&
      typeof npc.x === "number" &&
      typeof npc.y === "number" &&
      typeof npc.nick === "string" &&
      typeof npc.prof === "string" &&
      typeof npc.type === "number" &&
      typeof npc.wt === "number" &&
      typeof npc.lvl === "number" &&
      typeof npc.icon === "string"
    );
  }

  private clearInitialDetectionRetry(): void {
    if (this.initialDetectionRetryTimeout !== null) {
      clearTimeout(this.initialDetectionRetryTimeout);
    }

    this.initialDetectionRetryTimeout = null;
    this.initialDetectionRetryAttempts = 0;
  }

  private processInitialDetection(npcs: GameNpc[]): void {
    const context = this.createDetectionContext();

    const calculatedNpcs =
      npcs.reduce<GameNpcWithLocation[]>((acc, npc) => {
        if (!npc) return acc;

        const npcType = getNpcTypeByWt(
          NpcType,
          npc.wt,
          npc.prof,
          npc.type,
        ) as DetectorNpcType;

        const processedSettings = this.processGameNpcSettings(
          npc,
          npcType,
          context,
        );
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
    context: DetectionProcessingContext,
    event?: GameEvent,
  ): ProcessedNpcSettings | null {
    const { detectorSettings } = context;
    const settings = detectorSettings[npcType];
    if (!settings?.detect) return null;

    const icon = event
      ? getNpcIconFromEvent(event, npc.icon.id) ||
        Game.getNpcIcon(npc.icon.id) ||
        ""
      : Game.getNpcIcon(npc.icon.id) || "";

    const guildIds = this.resolveRoutingGuildIds(context, npcLevel);
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
    context: DetectionProcessingContext,
  ): ProcessedNpcSettings | null {
    const { detectorSettings } = context;
    const settings = detectorSettings[npcType];

    if (!settings?.detect) return null;

    const icon = Game.getNpcIcon(npc.tpl) || npc.icon || "";
    const guildIds = this.resolveRoutingGuildIds(context, npc.lvl);
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

  private createDetectionContext(): DetectionProcessingContext {
    return {
      detectorSettings: this.getDetectorSettings(),
      routedGuildIdsByLevel: new Map<number, string[]>(),
    };
  }

  private resolveRoutingGuildIds(
    context: DetectionProcessingContext,
    npcLevel: number,
  ): string[] {
    const cachedGuildIds = context.routedGuildIdsByLevel.get(npcLevel);
    if (cachedGuildIds) return cachedGuildIds;

    const { guildIds } = resolveNpcNotificationRouting({
      routingRules: context.detectorSettings.routingRules,
      npcLevel,
    });

    context.routedGuildIdsByLevel.set(npcLevel, guildIds);
    return guildIds;
  }

  private getCurrentAccountId() {
    return Game.getAccountId();
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
