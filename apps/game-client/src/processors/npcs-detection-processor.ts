import { composeNpcFromEvent } from "@/hooks/game-events/helpers/npc.helpers";
import {
  type GameNpcWithLocation,
  useNpcDetectorStore,
} from "@/store/npc-detector.store";
import { useWindowsStore } from "@/store/windows.store";
import type { GameEvent } from "@lootlog/margonem/game-events";
import type { RuntimeNpc } from "@/lib/margonem-runtime/runtime.types";
import { useNpcsStore } from "@/store/npcs.store";
import { useGameStore } from "@/store/game.store";
import { NpcType } from "@/api/npcs.api";
import {
  type EventNpcTemplatesById,
  getNpcTplFromEvent,
} from "@/utils/game/events/get-npc-tpl-from-event";
import { getNpcType } from "@lootlog/domain/npc-type";
import { getEntranceClosesAt } from "@/utils/game/hero-tracker-entrance";
import {
  isDetectorNpcType,
  type DetectorNpcType,
  type DetectorSettings,
  type DetectorTypeSettings,
} from "@lootlog/schema/account-preferences";
import { sendChatMessage, MessageType } from "@/api/chat.api";
import { createNotification } from "@/api/messaging.api";
import {
  buildNpcChatMessagePayload,
  buildNpcNotificationPayload,
  resolveNpcNotificationRouting,
} from "@/utils/notifications-and-detector/npc-notification";
import { playSound } from "@/lib/sound-playback";
import { getGameAccountPreferences } from "@/features/settings/persistence/use-game-account-preferences";
import { readCurrentSettingsDocuments } from "@/features/settings/persistence/settings-patch-client";
import { areSettingsDocumentsSettled } from "@/features/settings/persistence/settings-snapshot";
import { selectSettingsValue } from "@/features/settings/persistence/settings-documents";
import { getEffectiveDetectorSettings } from "@/lib/game-account-preferences";

// A rescan reads every NPC the projection holds when it runs, so it covers
// the packets that would otherwise wait behind it.
type PendingDetection =
  | { accountId: string; type: "event"; event: GameEvent }
  | { accountId: string; type: "rescan" };

type DetectionProcessingContext = {
  detectorSettings: DetectorSettings;
  /** The current character's master switch over every type's auto-send. */
  characterAutoSendEnabled: boolean;
  routedGuildIdsByLevel: Map<number, string[]>;
};

/** What the detector settings decide for one detected NPC type and level. */
type Detection = {
  settings: DetectorTypeSettings;
  guildIds: string[];
  autoSendNotification: boolean;
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
  private pendingDetections: PendingDetection[] = [];

  cleanup(): void {
    this.pendingDetections = [];
  }

  /**
   * Queued packets describe the map being left; the new map is rescanned
   * from the projection once the detector is ready.
   */
  handleMapChange(): void {
    const [pending] = this.pendingDetections;

    this.pendingDetections = pending
      ? [{ accountId: pending.accountId, type: "rescan" }]
      : [];
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

    if (!detectorReady || !this.processInitialDetectionFromStore()) {
      this.queueRescan(accountId);
    }
  }

  flushPending(accountId: string): void {
    const detectorReady = this.isDetectorReady(accountId);

    if (!detectorReady) {
      return;
    }

    const pendingDetections: PendingDetection[] = [];
    const remainingDetections: PendingDetection[] = [];

    for (const pendingDetection of this.pendingDetections) {
      if (pendingDetection.accountId === accountId) {
        pendingDetections.push(pendingDetection);
        continue;
      }

      remainingDetections.push(pendingDetection);
    }

    if (pendingDetections.length === 0) {
      return;
    }

    const deferredDetections: PendingDetection[] = [];

    pendingDetections.forEach((pendingDetection) => {
      if (pendingDetection.type !== "event") {
        if (!this.processInitialDetectionFromStore()) {
          deferredDetections.push(pendingDetection);
        }

        return;
      }

      this.processEvent(pendingDetection.event);
    });

    this.pendingDetections = [...remainingDetections, ...deferredDetections];
  }

  private queuePendingEvent(accountId: string, event: GameEvent): void {
    this.keepPendingDetectionsForAccount(accountId);

    if (this.pendingDetections.some(({ type }) => type === "rescan")) return;

    if (this.pendingDetections.length >= MAX_PENDING_DETECTIONS_PER_ACCOUNT) {
      this.pendingDetections = [{ accountId, type: "rescan" }];

      return;
    }

    this.pendingDetections.push({ accountId, type: "event", event });
  }

  private queueRescan(accountId: string): void {
    this.keepPendingDetectionsForAccount(accountId);

    if (this.pendingDetections.some(({ type }) => type === "rescan")) return;
    this.pendingDetections.push({ accountId, type: "rescan" });
  }

  private keepPendingDetectionsForAccount(accountId: string): void {
    this.pendingDetections = this.pendingDetections.filter(
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

    // Margonem sends `npcs` for both spawns and updates of a known NPC (position,
    // icon, template). Only NPCs the detector does not show yet are detections;
    // the rest update in place without a new alert, sound, auto-send or focus.
    // A Hero Tracker claimed while shown is the one update detected again: its
    // entrance just opened.
    const detectedNpcsById = new Map(
      useNpcDetectorStore.getState().npcs.map((npc) => [npc.id, npc]),
    );

    const updatedNpcs: { npcId: number; npc: Partial<GameNpcWithLocation> }[] =
      [];

    // Index the packet's templates and icons once instead of scanning them
    // per NPC. A later duplicate id wins, as in Margonem's own managers.
    const templatesById: EventNpcTemplatesById = new Map(
      event.npc_tpls?.map((template) => [template.id, template]),
    );

    const iconsById: ReadonlyMap<number, string> = new Map(
      event.icons?.map((icon) => [icon.id, icon.icon]),
    );

    const packet = { context, iconsById, templatesById };
    const npcs: GameNpcWithLocation[] = [];

    for (const npc of event.npcs) {
      const detectedNpc = detectedNpcsById.get(npc.id);
      const candidate = this.composeEventNpc(npc, detectedNpc, packet);

      if (!candidate) continue;
      const { composedNpc } = candidate;

      if (detectedNpc) {
        const { notificationSentAt: _notificationSentAt, ...npcUpdate } =
          composedNpc;

        updatedNpcs.push({ npcId: npc.id, npc: npcUpdate });

        const entranceOpened =
          detectedNpc.entranceClosesAt === undefined &&
          composedNpc.entranceClosesAt !== undefined;

        if (!entranceOpened) continue;
      } else {
        npcs.push(composedNpc);
      }

      this.collectDetectionIntents(
        intents,
        composedNpc,
        candidate.npcType,
        candidate.detection,
      );
    }

    if (updatedNpcs.length > 0) {
      useNpcDetectorStore.getState().setNpcStates(updatedNpcs);
    }

    if (npcs.length > 0) {
      useNpcDetectorStore.getState().addNpc(npcs, {
        highlightOnExisting: true,
      });
      useWindowsStore.getState().setOpen("npc-detector", true);
    }

    this.dispatchDetectionIntents(intents);
  }

  /** The packet NPC as the detector shows it, or null when it is not detected. */
  private composeEventNpc(
    npc: NonNullable<GameEvent["npcs"]>[number],
    detectedNpc: GameNpcWithLocation | undefined,
    {
      context,
      iconsById,
      templatesById,
    }: {
      context: DetectionProcessingContext;
      iconsById: ReadonlyMap<number, string>;
      templatesById: EventNpcTemplatesById;
    },
  ): {
    composedNpc: GameNpcWithLocation;
    detection: Detection;
    npcType: DetectorNpcType;
  } | null {
    const runtimeNpc = useNpcsStore.getState().getNpc(npc.id);

    const tpl =
      getNpcTplFromEvent(templatesById, npc.tpl) ??
      (runtimeNpc
        ? {
            icon: runtimeNpc.icon,
            lvl: runtimeNpc.level,
            nick: runtimeNpc.name,
            prof: runtimeNpc.profession,
            type: runtimeNpc.type,
            wt: runtimeNpc.weight,
            isHeroFromEvent: runtimeNpc.isHeroFromEvent,
          }
        : undefined);

    if (!tpl) return null;

    const npcType = getNpcType(NpcType, { ...tpl, name: tpl.nick });

    if (!isDetectorNpcType(npcType)) return null;

    const detection = this.resolveDetection(npcType, tpl.lvl, context);

    if (!detection) return null;

    const entranceClosesAt =
      npcType === NpcType.HERO_TRACKER
        ? getEntranceClosesAt(
            npc.killSeconds,
            detectedNpc?.entranceClosesAt ?? runtimeNpc?.entranceClosesAt,
          )
        : undefined;

    const icon = iconsById.get(npc.icon.id) ?? runtimeNpc?.icon ?? "";

    return {
      composedNpc: {
        ...composeNpcFromEvent(
          npc,
          tpl,
          icon,
          useGameStore.getState().game?.map.name ?? "",
        ),
        ...(entranceClosesAt !== undefined && { entranceClosesAt }),
      },
      detection,
      npcType,
    };
  }

  private processInitialDetectionFromStore(): boolean {
    const { npcsById, status } = useNpcsStore.getState();

    if (status !== "ready") return false;
    const npcs = Object.values(npcsById);

    if (npcs.length > 0) this.processInitialDetection(npcs);

    return true;
  }

  private processInitialDetection(npcs: RuntimeNpc[]): void {
    const context = this.createDetectionContext();
    const intents = this.createDetectionIntents();

    const calculatedNpcs: GameNpcWithLocation[] = [];

    for (const npc of npcs) {
      const npcType = getNpcType(NpcType, {
        wt: npc.weight,
        prof: npc.profession,
        type: npc.type,
        icon: npc.icon,
        isHeroFromEvent: npc.isHeroFromEvent,
        name: npc.name,
      });

      if (!isDetectorNpcType(npcType)) continue;

      const detection = this.resolveDetection(npcType, npc.level, context);

      if (!detection) continue;

      const composedNpc: GameNpcWithLocation = {
        actions: npc.actions,
        grp: npc.groupId,
        icon: npc.icon,
        id: npc.id,
        location: useGameStore.getState().game?.map.name ?? "",
        lvl: npc.level,
        nick: npc.name,
        notificationSentAt: null,
        prof: npc.profession,
        resp_rand: npc.respawnRandomness,
        type: npc.type,
        isHeroFromEvent: npc.isHeroFromEvent,
        wt: npc.weight,
        x: npc.x,
        y: npc.y,
        ...(npc.entranceClosesAt !== undefined && {
          entranceClosesAt: npc.entranceClosesAt,
        }),
      };

      this.collectDetectionIntents(intents, composedNpc, npcType, detection);
      calculatedNpcs.push(composedNpc);
    }

    if (calculatedNpcs.length > 0) {
      useNpcDetectorStore.getState().addNpc(calculatedNpcs);
      useWindowsStore.getState().setOpen("npc-detector", true);
      this.dispatchDetectionIntents(intents);
    }
  }

  private resolveDetection(
    npcType: DetectorNpcType,
    npcLevel: number,
    context: DetectionProcessingContext,
  ): Detection | null {
    const settings = context.detectorSettings[npcType];

    if (!settings?.detect) return null;

    const guildIds = this.resolveRoutingGuildIds(context, npcLevel);

    return {
      settings,
      guildIds,
      autoSendNotification:
        context.characterAutoSendEnabled &&
        settings.autoSend &&
        guildIds.length > 0,
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
    composedNpc: GameNpcWithLocation,
    npcType: DetectorNpcType,
    { settings, guildIds, autoSendNotification }: Detection,
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

    if (settings.notifySound) {
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
    const world = useGameStore.getState().game?.world;

    if (!world) return;

    const successfulNotifications = (
      await Promise.all(
        intents.map(async ({ composedNpc, guildIds }) => {
          try {
            const notificationResponse = await createNotification(
              buildNpcNotificationPayload({
                npc: composedNpc,
                world,
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
    ).filter((notification) => notification !== null);

    if (successfulNotifications.length === 0) {
      return;
    }

    const notificationSentAt = Date.now();

    useNpcDetectorStore.getState().setNpcStates(
      successfulNotifications.map(({ npc }) => ({
        npcId: npc.id,
        npc: { notificationSentAt },
      })),
    );

    await Promise.all(
      successfulNotifications.map(async ({ npc, guildIds }) => {
        try {
          const chatMessage = buildNpcChatMessagePayload({
            world,
            npc,
            guildIds,
            messageType: MessageType.NPC,
          });

          if (!chatMessage) return;

          await sendChatMessage(chatMessage);
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

    return getEffectiveDetectorSettings(
      getGameAccountPreferences(readCurrentSettingsDocuments(), accountId),
    );
  }

  private createDetectionContext(): DetectionProcessingContext {
    return {
      detectorSettings: this.getDetectorSettings(),
      characterAutoSendEnabled: selectSettingsValue(
        readCurrentSettingsDocuments(),
        "gameData.detectorAutoSendEnabled",
      ),
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
    if (accountId !== this.getCurrentAccountId()) return false;

    return areSettingsDocumentsSettled();
  }
}

export const npcsDetectionProcessor = new NpcsDetectionProcessor();
