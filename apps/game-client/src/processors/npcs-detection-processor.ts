import { composeNpcFromEvent } from "@/hooks/game-events/helpers/npc.helpers";
import type { EventNpc, ProcessedNpcSettings } from "@/hooks/game-events/types";
import {
  type GameNpcWithLocation,
  useNpcDetectorStore,
} from "@/store/npc-detector.store";
import { useWindowsStore } from "@/store/windows.store";
import type { GameEvent } from "@lootlog/margonem/game-events";
import type { RuntimeNpc } from "@/lib/margonem-runtime/runtime.types";
import type { NpcTpl } from "@lootlog/margonem/npc-tpl-manager";
import { useNpcsStore } from "@/store/npcs.store";
import { useGameStore } from "@/store/game.store";
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

const MAX_PENDING_DETECTIONS_PER_ACCOUNT = 200;

export class NpcsDetectionProcessor {
  private static pendingDetections: PendingDetection[] = [];
  cleanup(): void {
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

  bootstrapProjection(): void {
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

    this.processInitialDetectionFromStore();
  }

  handleInitialDetection(): void {
    this.bootstrapProjection();
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
        this.processInitialDetectionFromStore();
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
        const runtimeNpc = useNpcsStore.getState().getNpc(npc.id);
        const tpl =
          getNpcTplFromEvent(event, npc.tpl) ??
          (runtimeNpc
            ? ({
                icon: runtimeNpc.icon,
                id: runtimeNpc.templateId,
                lvl: runtimeNpc.level,
                nick: runtimeNpc.name,
                prof: runtimeNpc.profession,
                type: runtimeNpc.type,
                wt: runtimeNpc.weight,
              } as NpcTpl)
            : undefined);
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

        const composedNpc = composeNpcFromEvent(
          npc,
          tpl,
          processedSettings,
          useGameStore.getState().game?.map.name ?? "",
        );

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

  private processInitialDetectionFromStore(): void {
    const { npcsById, status } = useNpcsStore.getState();
    if (status !== "ready") return;
    const npcs = Object.values(npcsById);
    if (npcs.length > 0) this.processInitialDetection(npcs);
  }

  private processInitialDetection(npcs: RuntimeNpc[]): void {
    const context = this.createDetectionContext();
    const intents = this.createDetectionIntents();

    const calculatedNpcs =
      npcs.reduce<GameNpcWithLocation[]>((acc, npc) => {
        if (!npc) return acc;

        const npcType = getNpcTypeByWt(
          NpcType,
          npc.weight,
          npc.profession,
          npc.type,
        ) as DetectorNpcType;

        const processedSettings = this.processGameNpcSettings(
          npc,
          npcType,
          context,
        );
        if (!processedSettings) return acc;

        const composedNpc: GameNpcWithLocation = {
          actions: npc.actions,
          grp: npc.groupId,
          icon: processedSettings.icon,
          id: npc.id,
          location: useGameStore.getState().game?.map.name ?? "unknown",
          lvl: npc.level,
          nick: npc.name,
          notificationSent: false,
          prof: npc.profession,
          resp_rand: npc.respawnRandomness,
          tpl: npc.templateId,
          type: npc.type,
          wt: npc.weight,
          x: npc.x,
          y: npc.y,
        };

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

    const icon =
      (event ? getNpcIconFromEvent(event, npc.icon.id) : undefined) ??
      useNpcsStore.getState().getNpc(npc.id)?.icon ??
      "";

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
    npc: RuntimeNpc,
    npcType: DetectorNpcType,
    context: DetectionProcessingContext,
  ): ProcessedNpcSettings | null {
    const { detectorSettings } = context;
    const settings = detectorSettings[npcType];

    if (!settings?.detect) return null;

    const icon = npc.icon;
    const guildIds = this.resolveRoutingGuildIds(context, npc.level);
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
    return useGameStore.getState().game?.hero.accountId;
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
