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
    }
  | {
      accountId: string;
      type: "rescan";
    };

type DetectionProcessingContext = {
  detectorSettings: DetectorSettings;
  routedGuildIdsByLevel: Map<number, string[]>;
};

type NpcNotificationIntent = {
  composedNpc: GameNpcWithLocation;
  guildIds: string[];
};

type DetectionIntents = {
  notificationsByNpcId: Map<number, NpcNotificationIntent>;
  soundNpcTypes: Set<DetectorNpcType>;
};

// TODO: Temporary startup workaround. Replace this polling with an explicit
// NPC-ready signal from the game runtime; retry-based readiness checks are
// brittle and should not become our long-term pattern.
const INITIAL_DETECTION_RETRY_DELAY_MS = 100;
const INITIAL_DETECTION_MAX_RETRIES = 20;
const MAX_PENDING_DETECTIONS_PER_ACCOUNT = 200;

type InitialDetectionSnapshot = {
  npcs: GameNpc[];
};

export class NpcsDetectionProcessor {
  private static pendingDetections: PendingDetection[] = [];
  private initialDetectionRetryTimeout: ReturnType<typeof setTimeout> | null =
    null;
  private initialDetectionRetryAttempts = 0;

  cleanup(): void {
    this.clearInitialDetectionRetry();
    NpcsDetectionProcessor.pendingDetections = [];
  }

  handle(event: GameEvent): void {
    const accountId = this.getCurrentAccountId();
    if (!accountId) return;
    if (!this.isDetectorReady(accountId)) {
      this.queuePendingEvent(accountId, event);
      return;
    }

    this.processEvent(event);
  }

  handleInitialDetection(): void {
    const accountId = this.getCurrentAccountId();
    if (!accountId) return;

    const detectorReady = this.isDetectorReady(accountId);

    if (!detectorReady) {
      this.keepPendingDetectionsForAccount(accountId);
      const hasQueuedInitialDetection =
        NpcsDetectionProcessor.pendingDetections.some(
          (pendingDetection) =>
            pendingDetection.accountId === accountId &&
            pendingDetection.type !== "event",
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
      if (pendingDetection.type !== "event") {
        this.processInitialDetectionWithRetry();
        return;
      }

      this.processEvent(pendingDetection.event);
    });
  }

  private queuePendingEvent(accountId: string, event: GameEvent): void {
    this.keepPendingDetectionsForAccount(accountId);

    if (
      NpcsDetectionProcessor.pendingDetections.some(
        (pendingDetection) => pendingDetection.type === "rescan",
      )
    ) {
      return;
    }

    if (
      NpcsDetectionProcessor.pendingDetections.length >=
      MAX_PENDING_DETECTIONS_PER_ACCOUNT
    ) {
      NpcsDetectionProcessor.pendingDetections = [
        { accountId, type: "rescan" },
      ];
      return;
    }

    NpcsDetectionProcessor.pendingDetections.push({
      accountId,
      type: "event",
      event,
    });
  }

  private keepPendingDetectionsForAccount(accountId: string): void {
    NpcsDetectionProcessor.pendingDetections =
      NpcsDetectionProcessor.pendingDetections.filter(
        (pendingDetection) => pendingDetection.accountId === accountId,
      );
  }

  private processEvent(event: GameEvent): void {
    if (!event.npcs?.length) {
      return;
    }

    if (event.f?.init === "1") {
      return;
    }

    const context = this.createDetectionContext();
    const intents = this.createDetectionIntents();
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

        this.collectDetectionIntents(intents, {
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
      useNpcDetectorStore.getState().addNpc(npcs, {
        highlightOnExisting: true,
      });
      useWindowsStore.getState().setOpen("npc-detector", true);
      this.dispatchDetectionIntents(intents);
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
    const intents = this.createDetectionIntents();

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

        this.collectDetectionIntents(intents, {
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
      useNpcDetectorStore.getState().addNpc(calculatedNpcs);
      useWindowsStore.getState().setOpen("npc-detector", true);
      this.dispatchDetectionIntents(intents);
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

  private createDetectionIntents(): DetectionIntents {
    return {
      notificationsByNpcId: new Map(),
      soundNpcTypes: new Set(),
    };
  }

  private collectDetectionIntents(
    intents: DetectionIntents,
    {
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
    },
  ): void {
    if (autoSendNotification) {
      const existingIntent = intents.notificationsByNpcId.get(composedNpc.id);
      intents.notificationsByNpcId.set(composedNpc.id, {
        composedNpc,
        guildIds: [
          ...new Set([...(existingIntent?.guildIds ?? []), ...guildIds]),
        ],
      });
    }

    if (detectorSettings.notifySound) {
      intents.soundNpcTypes.add(npcType);
    }
  }

  private dispatchDetectionIntents(intents: DetectionIntents): void {
    for (const npcType of intents.soundNpcTypes) {
      playSound("detector", npcType);
    }

    if (intents.notificationsByNpcId.size > 0) {
      void this.autoSendNpcNotifications([
        ...intents.notificationsByNpcId.values(),
      ]);
    }
  }

  private async autoSendNpcNotifications(
    intents: readonly NpcNotificationIntent[],
  ): Promise<void> {
    const successfulNotifications = (
      await Promise.all(
        intents.map(async ({ composedNpc, guildIds }) => {
          try {
            const notificationResponse = await createNotification(
              buildNpcNotificationPayload({
                npc: composedNpc,
                guildIds,
              }),
            );
            return {
              guildIds: notificationResponse?.guildIds ?? guildIds,
              npc: composedNpc,
            };
          } catch (error) {
            console.warn(
              "[NpcsDetectionProcessor] Failed to send notification:",
              error,
            );
            return null;
          }
        }),
      )
    ).filter(
      (result): result is { guildIds: string[]; npc: GameNpcWithLocation } =>
        result !== null,
    );

    if (successfulNotifications.length === 0) {
      return;
    }

    useNpcDetectorStore.getState().setNpcStates(
      successfulNotifications.map(({ npc }) => ({
        npcId: npc.id,
        npc: { notificationSent: true },
      })),
    );

    await Promise.all(
      successfulNotifications.map(async ({ npc, guildIds }) => {
        try {
          await sendChatMessage(
            buildNpcChatMessagePayload({
              npc,
              guildIds,
              messageType: MessageType.NPC,
            }),
          );
        } catch (error) {
          console.warn(
            "[NpcsDetectionProcessor] Failed to send chat message:",
            error,
          );
        }
      }),
    );
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
