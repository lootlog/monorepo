import { getMargonemInterface } from "@/lib/margonem-runtime/runtime-adapter";
import { runtimeOtherHandles } from "@/lib/margonem-runtime/runtime-other-handles";
import { useGameStore } from "@/store/game.store";
import {
  AIR_TAG_MAX_BATCH_SIZE,
  isAirTagObservation,
  type AirTagObservation,
  type AirTagObservationBatch,
} from "@lootlog/types";
import type { Other, OtherCreate } from "@lootlog/margonem/game-events";

export const AIR_TAG_BATCH_INTERVAL_MS = 250;
export const AIR_TAG_HEARTBEAT_INTERVAL_MS = 5_000;
export const AIR_TAG_HEARTBEAT_SCAN_INTERVAL_MS = 5_000;
export const AIR_TAG_MOVEMENT_THRESHOLD_TILES = 3;
const MAX_LOCAL_TARGETS_PER_SCOPE = 100;

type ObservationPublisher = (batch: AirTagObservationBatch) => void;

type LocalAirTagTarget = AirTagObservation & {
  dir: number;
  lastPublishedAt: number;
  lastPublishedX: number;
  lastPublishedY: number;
};

type RuntimeOtherData = Partial<Omit<OtherCreate, "action">> & {
  id?: string | number;
};

interface AirTagObservationControllerOptions {
  now?: () => number;
  setTimeout?: typeof window.setTimeout;
  clearTimeout?: typeof window.clearTimeout;
  setInterval?: typeof window.setInterval;
  clearInterval?: typeof window.clearInterval;
}

export class AirTagObservationController {
  private readonly targets = new Map<string, LocalAirTagTarget>();
  private readonly pending = new Map<string, AirTagObservation>();
  private readonly now: () => number;
  private readonly scheduleTimeout: typeof window.setTimeout;
  private readonly cancelTimeout: typeof window.clearTimeout;
  private readonly scheduleInterval: typeof window.setInterval;
  private readonly cancelInterval: typeof window.clearInterval;
  private batchTimer: number | null = null;
  private heartbeatTimer: number | null = null;
  private enabled = false;
  private canPublish = false;
  private mapId: number | null = null;
  private publisher: ObservationPublisher | null = null;

  constructor(options: AirTagObservationControllerOptions = {}) {
    this.now = options.now ?? (() => Date.now());
    this.scheduleTimeout = options.setTimeout ?? window.setTimeout.bind(window);
    this.cancelTimeout =
      options.clearTimeout ?? window.clearTimeout.bind(window);
    this.scheduleInterval =
      options.setInterval ?? window.setInterval.bind(window);
    this.cancelInterval =
      options.clearInterval ?? window.clearInterval.bind(window);
  }

  configure({
    enabled,
    canPublish,
    mapId,
    publisher,
  }: {
    enabled: boolean;
    canPublish: boolean;
    mapId: number | null;
    publisher: ObservationPublisher;
  }): void {
    const shouldDetectCurrentOthers =
      enabled &&
      canPublish &&
      (!this.enabled || !this.canPublish || this.mapId !== mapId);
    const shouldClear =
      !enabled ||
      !canPublish ||
      this.mapId !== mapId ||
      (this.enabled && !this.canPublish);

    this.enabled = enabled;
    this.canPublish = canPublish;
    this.publisher = publisher;

    if (shouldClear) {
      this.clearState();
    }
    this.mapId = mapId;

    if (shouldDetectCurrentOthers) {
      this.detectCurrentOthers();
    }
  }

  handle(entries: Other): void {
    if (!this.isActive()) return;

    for (const [targetId, entry] of Object.entries(entries)) {
      if (!entry || typeof entry !== "object") continue;

      if ("action" in entry && entry.action === "CREATE") {
        this.handleCreate(targetId, entry);
      } else if ("del" in entry && typeof entry.del === "number") {
        this.handleDelete(targetId);
      } else if (
        "x" in entry &&
        "y" in entry &&
        "dir" in entry &&
        Number.isInteger(entry.x) &&
        Number.isInteger(entry.y) &&
        Number.isInteger(entry.dir)
      ) {
        this.handleMovement(targetId, entry.x, entry.y, entry.dir);
      }
    }
  }

  resetForMap(mapId: number): void {
    this.clearState();
    this.mapId = mapId;
  }

  clear(): void {
    this.clearState();
    this.mapId = null;
  }

  detectCurrentOthers(): void {
    if (!this.isActive() || getMargonemInterface() !== "ni") return;

    const runtimeOthers = runtimeOtherHandles.getAll();

    for (const [fallbackTargetId, other] of Object.entries(runtimeOthers)) {
      if (!other.d) continue;

      const targetId = String(other.d.id ?? fallbackTargetId);
      this.handleCreate(targetId, other.d);
    }
  }

  private handleCreate(targetId: string, create: RuntimeOtherData): void {
    if (targetId === useGameStore.getState().game?.hero.characterId) return;

    const observation = this.toObservation(targetId, create);
    if (
      !observation ||
      typeof create.dir !== "number" ||
      !Number.isInteger(create.dir)
    ) {
      return;
    }

    const now = this.now();
    const target: LocalAirTagTarget = {
      ...observation,
      dir: create.dir,
      lastPublishedAt: 0,
      lastPublishedX: observation.x,
      lastPublishedY: observation.y,
    };
    this.retainTargetCapacity(targetId);
    this.targets.set(targetId, target);
    this.queue(target, now);
    this.startHeartbeatTimer();
  }

  private handleMovement(
    targetId: string,
    x: number,
    y: number,
    dir: number,
  ): void {
    const target = this.targets.get(targetId);
    if (!target) return;

    target.x = x;
    target.y = y;
    target.dir = dir;

    const movedFarEnough =
      Math.max(
        Math.abs(target.x - target.lastPublishedX),
        Math.abs(target.y - target.lastPublishedY),
      ) >= AIR_TAG_MOVEMENT_THRESHOLD_TILES;
    const heartbeatDue =
      this.now() - target.lastPublishedAt >= AIR_TAG_HEARTBEAT_INTERVAL_MS;

    if (movedFarEnough || heartbeatDue) {
      this.queue(target, this.now());
    }
  }

  private handleDelete(targetId: string): void {
    this.targets.delete(targetId);
    this.pending.delete(targetId);
    if (this.targets.size === 0) {
      this.stopHeartbeatTimer();
    }
  }

  private toObservation(
    targetId: string,
    create: RuntimeOtherData,
  ): AirTagObservation | null {
    const observation = {
      targetId,
      nickname: create.nick,
      ...(create.clan ? { clan: create.clan } : {}),
      relation: create.relation,
      x: create.x,
      y: create.y,
    };

    return isAirTagObservation(observation) ? observation : null;
  }

  private queue(target: LocalAirTagTarget, publishedAt: number): void {
    target.lastPublishedAt = publishedAt;
    target.lastPublishedX = target.x;
    target.lastPublishedY = target.y;
    this.pending.set(target.targetId, {
      targetId: target.targetId,
      nickname: target.nickname,
      ...(target.clan ? { clan: target.clan } : {}),
      relation: target.relation,
      x: target.x,
      y: target.y,
    });
    this.scheduleBatch();
  }

  private scheduleBatch(): void {
    if (this.batchTimer !== null) return;

    this.batchTimer = this.scheduleTimeout(() => {
      this.batchTimer = null;
      this.flushBatch();
    }, AIR_TAG_BATCH_INTERVAL_MS);
  }

  private flushBatch(): void {
    if (!this.isActive() || this.mapId === null || !this.publisher) {
      this.pending.clear();
      return;
    }

    const observations = [...this.pending.values()].slice(
      0,
      AIR_TAG_MAX_BATCH_SIZE,
    );
    for (const observation of observations) {
      this.pending.delete(observation.targetId);
    }
    if (observations.length > 0) {
      this.publisher({ expectedMapId: this.mapId, observations });
    }
    if (this.pending.size > 0) {
      this.scheduleBatch();
    }
  }

  private startHeartbeatTimer(): void {
    if (this.heartbeatTimer !== null) return;

    this.heartbeatTimer = this.scheduleInterval(() => {
      if (!this.isActive()) return;

      const now = this.now();
      for (const target of this.targets.values()) {
        if (now - target.lastPublishedAt >= AIR_TAG_HEARTBEAT_INTERVAL_MS) {
          this.queue(target, now);
        }
      }
    }, AIR_TAG_HEARTBEAT_SCAN_INTERVAL_MS);
  }

  private stopHeartbeatTimer(): void {
    if (this.heartbeatTimer === null) return;

    this.cancelInterval(this.heartbeatTimer);
    this.heartbeatTimer = null;
  }

  private clearState(): void {
    this.targets.clear();
    this.pending.clear();
    if (this.batchTimer !== null) {
      this.cancelTimeout(this.batchTimer);
      this.batchTimer = null;
    }
    this.stopHeartbeatTimer();
  }

  private retainTargetCapacity(targetId: string): void {
    if (
      this.targets.has(targetId) ||
      this.targets.size < MAX_LOCAL_TARGETS_PER_SCOPE
    ) {
      return;
    }

    const oldestTargetId = this.targets.keys().next().value;
    if (oldestTargetId !== undefined) {
      this.targets.delete(oldestTargetId);
      this.pending.delete(oldestTargetId);
    }
  }

  private isActive(): boolean {
    return this.enabled && this.canPublish && getMargonemInterface() === "ni";
  }
}

export const airTagObservationController = new AirTagObservationController();
