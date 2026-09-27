import type { AirTagSubscriptionAck } from "@lootlog/protocol/realtime";
import {
  isAirTagScopeSnapshot,
  isAirTagScopeUpdateEvent,
  isAirTagUpdateEvent,
  type AirTagScopeSnapshot,
  type AirTagScopeUpdateEvent,
  type AirTagTarget,
} from "@lootlog/schema/air-tag";

const MAX_QUEUED_UPDATES = 1_000;

const MAX_TARGETS_PER_SCOPE = 100;

// Longer than the gateway takes to remove a player every observer saw leave.
const DEPARTED_HIDE_MS = 3_000;

type AirTagScopeState = Omit<AirTagScopeSnapshot, "targets"> & {
  targets: Map<string, AirTagTarget>;
  /**
   * Revision of each target's last update or removal. Frames of two gateway
   * instances may arrive out of order; a late one must not restore a removed
   * target or an older position.
   */
  revisions: Map<string, number>;
  /** Revision every target not listed in `revisions` is known at. */
  baseRevision: number;
};

const getScopeKey = ({
  guildId,
  world,
  mapId,
}: Pick<AirTagScopeSnapshot, "guildId" | "world" | "mapId">) =>
  `${guildId}:${world}:${mapId}`;

/** Moves gateway (Redis) timestamps onto the local clock, so a skewed clock cannot hide or keep markers. */
const toLocalTarget = (target: AirTagTarget, offset: number): AirTagTarget => ({
  ...target,
  observedAt: target.observedAt + offset,
  ...(target.enemyObservedAt !== undefined && {
    enemyObservedAt: target.enemyObservedAt + offset,
  }),
  ...(target.clanEnemyObservedAt !== undefined && {
    clanEnemyObservedAt: target.clanEnemyObservedAt + offset,
  }),
});

const compareEpoch = (
  first: Pick<AirTagScopeSnapshot, "epochId" | "epochStartedAt">,
  second: Pick<AirTagScopeSnapshot, "epochId" | "epochStartedAt">,
) => {
  if (first.epochStartedAt !== second.epochStartedAt) {
    return first.epochStartedAt - second.epochStartedAt;
  }

  return first.epochId.localeCompare(second.epochId);
};

export class AirTagReceiveController {
  private readonly scopes = new Map<string, AirTagScopeState>();
  private readonly changeListeners = new Set<() => void>();
  private readonly departedUntil = new Map<string, number>();
  private queuedUpdates: AirTagScopeUpdateEvent[] = [];
  private currentRequestId: string | null = null;
  private currentWorld: string | null = null;
  private currentMapId: number | null = null;
  private allowedOrganizations: ReadonlySet<string> | undefined;

  constructor(private readonly now: () => number = () => Date.now()) {}

  beginSubscription(
    requestId: string,
    world: string,
    mapId: number,
    preserveScopes = false,
  ): void {
    if (
      !preserveScopes ||
      this.currentWorld !== world ||
      this.currentMapId !== mapId
    )
      this.clear();
    this.queuedUpdates = [];
    this.currentRequestId = requestId;
    this.currentWorld = world;
    this.currentMapId = mapId;
  }

  subscribe(listener: () => void): () => void {
    this.changeListeners.add(listener);

    return () => {
      this.changeListeners.delete(listener);
    };
  }

  applySubscriptionAck(
    acknowledgement: typeof AirTagSubscriptionAck.Type,
  ): void {
    if (acknowledgement.requestId !== this.currentRequestId) return;

    const queuedUpdates = this.queuedUpdates;
    this.queuedUpdates = [];
    this.currentRequestId = null;

    if (acknowledgement.status === "rejected") {
      this.scopes.clear();
      this.notifyChange();

      return;
    }

    for (const snapshot of acknowledgement.scopes) {
      if (!this.isCurrentSnapshot(snapshot)) continue;

      // Older gateways send no server time; their timestamps stay as sent.
      const offset =
        snapshot.serverTime === undefined
          ? 0
          : this.now() - snapshot.serverTime;

      const scope = this.createScope(snapshot, snapshot.revision);

      for (const target of snapshot.targets)
        this.setTarget(scope, toLocalTarget(target, offset), snapshot.revision);
      this.scopes.set(getScopeKey(snapshot), scope);
    }

    [...queuedUpdates]
      .sort((first, second) => {
        const epochOrder = compareEpoch(first, second);

        return epochOrder === 0 ? first.revision - second.revision : epochOrder;
      })
      .forEach((update) => this.applyUpdate(update));
    this.notifyChange();
  }

  /** One target from a gateway that predates `air-tag.scope-updated`. */
  handleUpdate(value: unknown): void {
    if (!isAirTagUpdateEvent(value)) return;
    const { target, ...scope } = value;

    this.receive({ ...scope, targets: [target], removedTargetIds: [] });
  }

  handleScopeUpdate(value: unknown): void {
    if (!isAirTagScopeUpdateEvent(value)) return;

    this.receive(value);
  }

  /** Hides a player the hero saw leave until the gateway removes them. */
  hideDeparted(targetId: string): void {
    this.departedUntil.set(targetId, this.now() + DEPARTED_HIDE_MS);
    this.notifyChange();
    // Shows the player again when another member still reports them.
    setTimeout(() => this.notifyChange(), DEPARTED_HIDE_MS);
  }

  private receive(value: AirTagScopeUpdateEvent): void {
    if (!this.isCurrentMap(value)) return;
    const now = this.now();

    // The gateway sends an update as it observes the targets.
    const update = {
      ...value,
      targets: value.targets.map((target) =>
        toLocalTarget(target, now - target.observedAt),
      ),
    };

    if (this.currentRequestId) {
      if (this.queuedUpdates.length >= MAX_QUEUED_UPDATES) {
        this.queuedUpdates.shift();
      }

      this.queuedUpdates.push(update);

      return;
    }

    if (this.applyUpdate(update)) {
      this.notifyChange();
    }
  }

  getRenderableTargets(now: number, ttlMs: number): AirTagTarget[] {
    const targets = new Map<string, AirTagTarget>();

    for (const [targetId, hiddenUntil] of this.departedUntil) {
      if (hiddenUntil <= now) this.departedUntil.delete(targetId);
    }

    for (const scope of this.scopes.values()) {
      for (const [targetId, target] of scope.targets) {
        if (now - target.observedAt >= ttlMs) {
          scope.targets.delete(targetId);
          continue;
        }

        if (this.departedUntil.has(targetId)) continue;

        const existing = targets.get(targetId);

        if (!existing) {
          targets.set(targetId, { ...target });
          continue;
        }

        const freshest =
          target.observedAt > existing.observedAt ? target : existing;

        targets.set(targetId, {
          ...freshest,
          enemyObservedAt: this.maximumTimestamp(
            existing.enemyObservedAt,
            target.enemyObservedAt,
          ),
          clanEnemyObservedAt: this.maximumTimestamp(
            existing.clanEnemyObservedAt,
            target.clanEnemyObservedAt,
          ),
        });
      }
    }

    return [...targets.values()];
  }

  retainOrganizations(organizationIds?: ReadonlySet<string>): void {
    this.allowedOrganizations = organizationIds;

    if (!organizationIds) return;
    let changed = false;

    for (const [key, scope] of this.scopes) {
      if (organizationIds.has(scope.guildId)) continue;
      this.scopes.delete(key);
      changed = true;
    }

    this.queuedUpdates = this.queuedUpdates.filter((update) =>
      organizationIds.has(update.guildId),
    );

    if (changed) this.notifyChange();
  }

  clear(): void {
    this.scopes.clear();
    this.departedUntil.clear();
    this.queuedUpdates = [];
    this.currentRequestId = null;
    this.currentWorld = null;
    this.currentMapId = null;
    this.notifyChange();
  }

  private applyUpdate(update: AirTagScopeUpdateEvent): boolean {
    const key = getScopeKey(update);
    let scope = this.scopes.get(key);

    if (!scope) return false;

    const epochOrder = compareEpoch(update, scope);

    if (epochOrder < 0) return false;

    if (epochOrder > 0) {
      scope = this.createScope(update, 0);
      this.scopes.set(key, scope);
    }

    let changed = epochOrder > 0;

    for (const targetId of update.removedTargetIds) {
      if (!this.isNewer(scope, targetId, update.revision)) continue;
      scope.revisions.set(targetId, update.revision);
      changed = scope.targets.delete(targetId) || changed;
    }

    for (const target of update.targets) {
      if (!this.isNewer(scope, target.targetId, update.revision)) continue;
      this.setTarget(scope, target, update.revision);
      changed = true;
    }

    scope.revision = Math.max(scope.revision, update.revision);

    return changed;
  }

  private isNewer(
    scope: AirTagScopeState,
    targetId: string,
    revision: number,
  ): boolean {
    return revision > (scope.revisions.get(targetId) ?? scope.baseRevision);
  }

  private createScope(
    identity: Omit<AirTagScopeSnapshot, "targets" | "serverTime">,
    baseRevision: number,
  ): AirTagScopeState {
    return {
      guildId: identity.guildId,
      world: identity.world,
      mapId: identity.mapId,
      epochId: identity.epochId,
      epochStartedAt: identity.epochStartedAt,
      revision: identity.revision,
      targets: new Map(),
      revisions: new Map(),
      baseRevision,
    };
  }

  private setTarget(
    scope: AirTagScopeState,
    target: AirTagTarget,
    revision: number,
  ): void {
    const { targets, revisions } = scope;
    targets.set(target.targetId, target);
    revisions.set(target.targetId, revision);

    // Removed targets leave revisions behind; keep only those of current targets.
    if (revisions.size > MAX_TARGETS_PER_SCOPE * 4) {
      for (const targetId of revisions.keys()) {
        if (!targets.has(targetId)) revisions.delete(targetId);
      }
    }

    if (targets.size <= MAX_TARGETS_PER_SCOPE) return;

    let oldestTarget: AirTagTarget | undefined;

    for (const candidate of targets.values()) {
      if (
        !oldestTarget ||
        candidate.observedAt < oldestTarget.observedAt ||
        (candidate.observedAt === oldestTarget.observedAt &&
          candidate.targetId.localeCompare(oldestTarget.targetId) < 0)
      ) {
        oldestTarget = candidate;
      }
    }

    if (oldestTarget) {
      targets.delete(oldestTarget.targetId);
    }
  }

  private isCurrentSnapshot(value: unknown): value is AirTagScopeSnapshot {
    return isAirTagScopeSnapshot(value) && this.isCurrentMap(value);
  }

  private isCurrentMap(value: {
    world: string;
    mapId: number;
    guildId: string;
  }): boolean {
    return (
      (!this.allowedOrganizations ||
        this.allowedOrganizations.has(value.guildId)) &&
      value.world === this.currentWorld &&
      value.mapId === this.currentMapId
    );
  }

  private maximumTimestamp(
    first: number | undefined,
    second: number | undefined,
  ): number | undefined {
    if (first === undefined) return second;

    if (second === undefined) return first;

    return Math.max(first, second);
  }

  private notifyChange(): void {
    for (const listener of this.changeListeners) {
      listener();
    }
  }
}

export const airTagReceiveController = new AirTagReceiveController();
