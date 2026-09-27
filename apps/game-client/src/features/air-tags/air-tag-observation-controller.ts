import { useGameStore } from "@/store/game.store";
import { runtimeOtherHandles } from "@/lib/margonem-runtime/runtime-other-handles";
import {
  AIR_TAG_MAX_BATCH_SIZE,
  isAirTagObservation,
  isAirTagRelation,
  type AirTagDeparture,
  type AirTagDepartureReason,
  type AirTagObservation,
  type AirTagObservationBatch,
} from "@lootlog/schema/air-tag";
import type {
  Other,
  OtherCreate,
  OtherUpdate,
} from "@lootlog/margonem/game-events";

export const AIR_TAG_BATCH_INTERVAL_MS = 250;

export const AIR_TAG_HEARTBEAT_INTERVAL_MS = 5_000;

// Keeps a still target's sightings under 6.25 s apart, inside the 10 s AirTag and map-threat freshness windows.
export const AIR_TAG_HEARTBEAT_SCAN_INTERVAL_MS = 1_000;

const AIR_TAG_HEARTBEAT_ALIGNMENT_MS = 2_000;

export const AIR_TAG_MOVEMENT_THRESHOLD_TILES = 2;

// How far a walking player and the hero may both have moved since the game's last position update.
const AIR_TAG_SIGHT_MARGIN_TILES = 3;

const MAX_LOCAL_TARGETS_PER_SCOPE = 100;

const isSameClan = (
  first: AirTagObservation["clan"],
  second: AirTagObservation["clan"],
) => first?.id === second?.id && first?.name === second?.name;

type ObservationPublisher = (batch: AirTagObservationBatch) => void;

type LocalAirTagTarget = AirTagObservation & {
  dir: number;
  lastPublishedAt: number;
  lastPublishedX: number;
  lastPublishedY: number;
  /** The gateway counts this character among the target's observers. */
  sent: boolean;
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
  private readonly departures = new Map<string, AirTagDeparture>();
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
  private onLeftMap: ((targetId: string) => void) | null = null;

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
    onLeftMap,
  }: {
    enabled: boolean;
    canPublish: boolean;
    mapId: number | null;
    publisher: ObservationPublisher;
    /** A player the hero saw leave the map. */
    onLeftMap?: (targetId: string) => void;
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
    this.onLeftMap = onLeftMap ?? null;

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
      } else if ("del" in entry) {
        if (typeof entry.del === "number") this.handleDelete(targetId);
      } else {
        this.handleUpdate(targetId, entry);
      }
    }
  }

  resetForMap(mapId: number): void {
    this.clearState();
    this.mapId = mapId;
  }

  /** A reload rebuilds the map's players from fresh CREATE entries. */
  forgetTargets(): void {
    this.clearState();
  }

  clear(): void {
    this.clearState();
    this.mapId = null;
  }

  detectCurrentOthers(): void {
    if (!this.isActive() || useGameStore.getState().game?.interface !== "ni")
      return;

    const runtimeOthers = runtimeOtherHandles.getAll();

    for (const [fallbackTargetId, other] of Object.entries(runtimeOthers)) {
      if (!("d" in other) || !other.d) continue;

      const targetId = String(other.d.id ?? fallbackTargetId);
      this.handleCreate(targetId, other.d);
    }
  }

  private handleCreate(targetId: string, create: RuntimeOtherData): void {
    if (targetId === useGameStore.getState().game?.hero.characterId) return;

    const observation = this.toObservation(targetId, create);

    if (
      !observation ||
      create.dir === undefined ||
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
      // The gateway still counts this character when its departure never went out.
      sent:
        this.targets.get(targetId)?.sent === true ||
        this.departures.delete(targetId),
    };

    this.retainTargetCapacity(targetId);
    this.targets.set(targetId, target);
    this.queue(target, now);
    this.startHeartbeatTimer();
  }

  /** Margonem sends only changed fields: movement, stasis, a relation or clan change, a level-up. */
  private handleUpdate(targetId: string, update: OtherUpdate): void {
    const target = this.targets.get(targetId);

    if (!target) return;
    const moved = this.applyMovement(target, update);
    const changed = this.applyAttributes(target, update, moved);

    const movedFarEnough =
      Math.max(
        Math.abs(target.x - target.lastPublishedX),
        Math.abs(target.y - target.lastPublishedY),
      ) >= AIR_TAG_MOVEMENT_THRESHOLD_TILES;

    const heartbeatDue =
      moved &&
      this.now() - target.lastPublishedAt >= AIR_TAG_HEARTBEAT_INTERVAL_MS;

    if (changed || movedFarEnough || heartbeatDue) {
      this.queue(target, this.now());
    }
  }

  private applyMovement(
    target: LocalAirTagTarget,
    { x, y, dir }: OtherUpdate,
  ): boolean {
    if (dir !== undefined && Number.isInteger(dir)) target.dir = dir;

    if (
      x === undefined ||
      y === undefined ||
      !Number.isInteger(x) ||
      !Number.isInteger(y)
    )
      return false;
    target.x = x;
    target.y = y;

    return true;
  }

  /** Returns whether an attribute other members see has changed. */
  private applyAttributes(
    target: LocalAirTagTarget,
    update: OtherUpdate,
    moved: boolean,
  ): boolean {
    // Margonem ends stasis on movement without sending `stasis`.
    const stasis =
      update.stasis === undefined
        ? target.stasis && !moved
        : update.stasis === 1;

    let changed = stasis !== target.stasis;
    target.stasis = stasis;

    if (
      isAirTagRelation(update.relation) &&
      update.relation !== target.relation
    ) {
      target.relation = update.relation;
      changed = true;
    }

    if ("clan" in update && !isSameClan(update.clan, target.clan)) {
      if (update.clan) target.clan = update.clan;
      else delete target.clan;
      changed = true;
    }

    if (
      update.lvl !== undefined &&
      Number.isInteger(update.lvl) &&
      update.lvl !== target.lvl
    ) {
      target.lvl = update.lvl;
      changed = true;
    }

    return changed;
  }

  private handleDelete(targetId: string): void {
    const target = this.targets.get(targetId);
    this.targets.delete(targetId);
    this.pending.delete(targetId);

    if (this.targets.size === 0) {
      this.stopHeartbeatTimer();
    }

    if (!target) return;
    const reason = this.getDepartureReason(target);

    if (reason === "left-map") this.onLeftMap?.(targetId);

    if (!target.sent) return;
    this.departures.set(targetId, { targetId, reason });
    this.scheduleBatch();
  }

  /**
   * Margonem sends `del` both when a player leaves the map and when they
   * leave the hero's war shadow range. Only a player well inside that range,
   * or any player on a map without war shadow, has certainly left the map.
   */
  private getDepartureReason(target: LocalAirTagTarget): AirTagDepartureReason {
    const game = useGameStore.getState().game;

    if (!game || game.map.id !== this.mapId) return "out-of-sight";
    const range = game.map.visibility;

    if (range <= 0) return "left-map";

    return Math.hypot(target.x - game.hero.x, target.y - game.hero.y) <=
      range - AIR_TAG_SIGHT_MARGIN_TILES
      ? "left-map"
      : "out-of-sight";
  }

  private toObservation(
    targetId: string,
    create: RuntimeOtherData,
  ): AirTagObservation | null {
    const observation = {
      targetId,
      nickname: create.nick,
      relation: create.relation,
      x: create.x,
      y: create.y,
      stasis: create.stasis === 1,
    };

    if (create.clan) Object.assign(observation, { clan: create.clan });

    if (create.lvl !== undefined)
      Object.assign(observation, { lvl: create.lvl });

    if (create.prof) Object.assign(observation, { prof: create.prof });

    return isAirTagObservation(observation) ? observation : null;
  }

  private queue(target: LocalAirTagTarget, publishedAt: number): void {
    target.lastPublishedAt = publishedAt;
    target.lastPublishedX = target.x;
    target.lastPublishedY = target.y;

    const observation: AirTagObservation = {
      targetId: target.targetId,
      nickname: target.nickname,
      relation: target.relation,
      x: target.x,
      y: target.y,
      stasis: target.stasis,
    };

    if (target.clan) observation.clan = target.clan;

    if (target.lvl !== undefined) observation.lvl = target.lvl;

    if (target.prof) observation.prof = target.prof;

    // One malformed partial update must not get the whole batch rejected.
    if (!isAirTagObservation(observation)) return;
    this.pending.set(target.targetId, observation);
    this.scheduleBatch();
  }

  /** Sends a rate-limited batch again, unless a newer observation of a target is already queued. */
  retry(batch: AirTagObservationBatch, delayMs: number): void {
    if (!this.isActive() || batch.expectedMapId !== this.mapId) return;

    for (const observation of batch.observations) {
      if (
        this.targets.has(observation.targetId) &&
        !this.pending.has(observation.targetId)
      )
        this.pending.set(observation.targetId, observation);
    }

    for (const departure of batch.departures ?? []) {
      if (
        !this.targets.has(departure.targetId) &&
        !this.departures.has(departure.targetId)
      )
        this.departures.set(departure.targetId, departure);
    }

    if (this.batchTimer !== null) this.cancelTimeout(this.batchTimer);
    this.batchTimer = null;
    this.scheduleBatch(Math.max(delayMs, AIR_TAG_BATCH_INTERVAL_MS));
  }

  private scheduleBatch(delayMs = AIR_TAG_BATCH_INTERVAL_MS): void {
    if (this.batchTimer !== null) return;

    this.batchTimer = this.scheduleTimeout(() => {
      this.batchTimer = null;
      this.flushBatch();
    }, delayMs);
  }

  private flushBatch(): void {
    if (!this.isActive() || this.mapId === null || !this.publisher) {
      this.pending.clear();
      this.departures.clear();

      return;
    }

    const observations = [...this.pending.values()].slice(
      0,
      AIR_TAG_MAX_BATCH_SIZE,
    );

    const departures = [...this.departures.values()].slice(
      0,
      AIR_TAG_MAX_BATCH_SIZE,
    );

    for (const observation of observations) {
      this.pending.delete(observation.targetId);
      const target = this.targets.get(observation.targetId);

      if (target) target.sent = true;
    }

    for (const departure of departures) {
      this.departures.delete(departure.targetId);
    }

    if (observations.length > 0 || departures.length > 0) {
      this.publisher({
        expectedMapId: this.mapId,
        observations,
        ...(departures.length > 0 && { departures }),
      });
    }

    if (this.pending.size > 0 || this.departures.size > 0) {
      this.scheduleBatch();
    }
  }

  private startHeartbeatTimer(): void {
    if (this.heartbeatTimer !== null) return;

    this.heartbeatTimer = this.scheduleInterval(() => {
      if (!this.isActive()) return;

      const now = this.now();
      const targets = [...this.targets.values()];

      if (
        !targets.some(
          (target) =>
            now - target.lastPublishedAt >= AIR_TAG_HEARTBEAT_INTERVAL_MS,
        )
      )
        return;

      // Targets due soon ride along, so heartbeats settle into one batch per interval.
      for (const target of targets) {
        if (
          now - target.lastPublishedAt >=
          AIR_TAG_HEARTBEAT_INTERVAL_MS - AIR_TAG_HEARTBEAT_ALIGNMENT_MS
        ) {
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
    this.departures.clear();

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
    return (
      this.enabled &&
      this.canPublish &&
      useGameStore.getState().game?.interface === "ni"
    );
  }
}

export const airTagObservationController = new AirTagObservationController();
