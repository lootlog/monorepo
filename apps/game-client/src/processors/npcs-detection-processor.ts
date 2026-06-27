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

const INITIAL_DETECTION_RETRY_DELAY_MS = 100;
const INITIAL_DETECTION_MAX_RETRIES = 20;
const NPC_INITIAL_DETECTION_DEBUG_PREFIX = "[DEBUG-NPC-INIT]";

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
    if (!accountId) {
      this.debugLog("handleInitialDetection skipped: missing account id");
      return;
    }

    const detectorReady = this.isDetectorReady(accountId);
    this.debugLog("handleInitialDetection called", {
      accountId,
      detectorReady,
      pendingDetectionsCount: NpcsDetectionProcessor.pendingDetections.length,
      retryActive: this.initialDetectionRetryTimeout !== null,
      retryAttempts: this.initialDetectionRetryAttempts,
    });

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

        this.debugLog("queued initial detection until preferences are ready", {
          accountId,
          pendingDetectionsCount:
            NpcsDetectionProcessor.pendingDetections.length,
        });
      } else {
        this.debugLog("initial detection already queued", {
          accountId,
          pendingDetectionsCount:
            NpcsDetectionProcessor.pendingDetections.length,
        });
      }
      return;
    }

    this.processInitialDetectionWithRetry();
  }

  flushPending(accountId: string): void {
    const detectorReady = this.isDetectorReady(accountId);
    const accountPendingDetections =
      NpcsDetectionProcessor.pendingDetections.filter(
        (pendingDetection) => pendingDetection.accountId === accountId,
      );

    this.debugLog("flushPending called", {
      accountId,
      detectorReady,
      accountPendingDetectionsCount: accountPendingDetections.length,
      totalPendingDetectionsCount:
        NpcsDetectionProcessor.pendingDetections.length,
    });

    if (!detectorReady) {
      this.debugLog("flushPending skipped: detector not ready", {
        accountId,
      });
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
      this.debugLog("flushPending skipped: no pending detections", {
        accountId,
      });
      return;
    }

    NpcsDetectionProcessor.pendingDetections = remainingDetections;

    this.debugLog("flushPending processing queued detections", {
      accountId,
      eventDetectionsCount: pendingDetections.filter(
        (pendingDetection) => pendingDetection.type === "event",
      ).length,
      initialDetectionsCount: pendingDetections.filter(
        (pendingDetection) => pendingDetection.type === "initial",
      ).length,
      remainingDetectionsCount: remainingDetections.length,
    });

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
      this.debugLog("event detection skipped: empty npcs payload", {
        hasNpcsKey: event.npcs !== undefined,
      });
      return;
    }

    if (event.f?.init === "1") {
      this.debugLog("event detection skipped: init packet", {
        eventNpcCount: event.npcs.length,
      });
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

    this.debugLog("event detection processed", {
      calculatedNpcCount: npcs.length,
      eventNpcCount: event.npcs.length,
    });
  }

  private processInitialDetectionWithRetry(): void {
    if (this.initialDetectionRetryTimeout !== null) {
      this.debugLog("initial detection retry already active", {
        retryAttempts: this.initialDetectionRetryAttempts,
      });
      return;
    }

    this.initialDetectionRetryAttempts = 0;
    this.debugLog("initial detection retry flow started", {
      maxRetries: INITIAL_DETECTION_MAX_RETRIES,
      retryDelayMs: INITIAL_DETECTION_RETRY_DELAY_MS,
    });
    this.tryProcessInitialDetection();
  }

  private tryProcessInitialDetection(): void {
    const npcs = this.getInitialDetectionNpcs();

    this.debugLog("initial detection attempt", {
      attempt: this.initialDetectionRetryAttempts,
      maxRetries: INITIAL_DETECTION_MAX_RETRIES,
      snapshotNpcCount: npcs.length,
      snapshotNpcIds: npcs.map((npc) => npc.id).slice(0, 10),
    });

    if (npcs.length > 0) {
      this.debugLog("initial detection snapshot ready", {
        attempt: this.initialDetectionRetryAttempts,
        snapshotNpcCount: npcs.length,
      });
      this.clearInitialDetectionRetry();
      this.processInitialDetection(npcs);
      return;
    }

    if (this.initialDetectionRetryAttempts >= INITIAL_DETECTION_MAX_RETRIES) {
      this.debugLog("initial detection retry limit reached", {
        attempts: this.initialDetectionRetryAttempts,
        maxRetries: INITIAL_DETECTION_MAX_RETRIES,
      });
      this.clearInitialDetectionRetry();
      return;
    }

    this.initialDetectionRetryAttempts += 1;
    this.debugLog("initial detection retry scheduled", {
      nextAttempt: this.initialDetectionRetryAttempts,
      retryDelayMs: INITIAL_DETECTION_RETRY_DELAY_MS,
    });
    this.initialDetectionRetryTimeout = setTimeout(() => {
      this.initialDetectionRetryTimeout = null;
      this.tryProcessInitialDetection();
    }, INITIAL_DETECTION_RETRY_DELAY_MS);
  }

  private getInitialDetectionNpcs(): GameNpc[] {
    try {
      return Game.npcs ?? [];
    } catch (error) {
      this.debugLog("initial detection Game.npcs read failed", {
        error,
      });
      return [];
    }
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

    this.debugLog("initial detection processed", {
      calculatedNpcCount: calculatedNpcs.length,
      calculatedNpcIds: calculatedNpcs.map((npc) => npc.id).slice(0, 10),
      snapshotNpcCount: npcs.length,
      snapshotNpcIds: npcs.map((npc) => npc.id).slice(0, 10),
    });
  }

  private debugLog(message: string, data?: Record<string, unknown>): void {
    if (data) {
      console.log(`${NPC_INITIAL_DETECTION_DEBUG_PREFIX} ${message}`, data);
      return;
    }

    console.log(`${NPC_INITIAL_DETECTION_DEBUG_PREFIX} ${message}`);
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
