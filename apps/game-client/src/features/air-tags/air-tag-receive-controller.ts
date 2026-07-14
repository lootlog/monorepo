import {
  isAirTagScopeSnapshot,
  isAirTagUpdateEvent,
  type AirTagScopeSnapshot,
  type AirTagSubscriptionAck,
  type AirTagTarget,
  type AirTagUpdateEvent,
} from "@lootlog/types";

const MAX_QUEUED_UPDATES = 1_000;

type AirTagScopeState = Omit<AirTagScopeSnapshot, "targets"> & {
  targets: Map<string, AirTagTarget>;
};

const getScopeKey = ({
  guildId,
  world,
  mapId,
}: Pick<AirTagScopeSnapshot, "guildId" | "world" | "mapId">) =>
  `${guildId}:${world}:${mapId}`;

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
  private queuedUpdates: AirTagUpdateEvent[] = [];
  private currentRequestId: string | null = null;
  private currentWorld: string | null = null;
  private currentMapId: number | null = null;

  beginSubscription(requestId: string, world: string, mapId: number): void {
    this.clear();
    this.currentRequestId = requestId;
    this.currentWorld = world;
    this.currentMapId = mapId;
  }

  applySubscriptionAck(acknowledgement: AirTagSubscriptionAck): void {
    if (acknowledgement.requestId !== this.currentRequestId) return;

    const queuedUpdates = this.queuedUpdates;
    this.queuedUpdates = [];
    this.currentRequestId = null;

    if (acknowledgement.status === "rejected") {
      this.scopes.clear();
      return;
    }

    for (const snapshot of acknowledgement.scopes) {
      if (!this.isCurrentSnapshot(snapshot)) continue;

      this.scopes.set(getScopeKey(snapshot), {
        ...snapshot,
        targets: new Map(
          snapshot.targets.map((target) => [target.targetId, target]),
        ),
      });
    }

    queuedUpdates
      .toSorted((first, second) => {
        const epochOrder = compareEpoch(first, second);
        return epochOrder === 0 ? first.revision - second.revision : epochOrder;
      })
      .forEach((update) => this.applyUpdate(update));
  }

  handleUpdate(value: unknown): void {
    if (!isAirTagUpdateEvent(value) || !this.isCurrentMap(value)) return;

    if (this.currentRequestId) {
      if (this.queuedUpdates.length >= MAX_QUEUED_UPDATES) {
        this.queuedUpdates.shift();
      }
      this.queuedUpdates.push(value);
      return;
    }

    this.applyUpdate(value);
  }

  getRenderableTargets(now: number, ttlMs: number): AirTagTarget[] {
    const targets = new Map<string, AirTagTarget>();

    for (const scope of this.scopes.values()) {
      for (const [targetId, target] of scope.targets) {
        if (now - target.observedAt >= ttlMs) {
          scope.targets.delete(targetId);
          continue;
        }

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

  clear(): void {
    this.scopes.clear();
    this.queuedUpdates = [];
    this.currentRequestId = null;
    this.currentWorld = null;
    this.currentMapId = null;
  }

  private applyUpdate(update: AirTagUpdateEvent): void {
    const scope = this.scopes.get(getScopeKey(update));
    if (!scope) return;

    const epochOrder = compareEpoch(update, scope);
    if (epochOrder < 0) return;

    if (epochOrder > 0) {
      this.scopes.set(getScopeKey(update), {
        guildId: update.guildId,
        world: update.world,
        mapId: update.mapId,
        epochId: update.epochId,
        epochStartedAt: update.epochStartedAt,
        revision: update.revision,
        targets: new Map([[update.target.targetId, update.target]]),
      });
      return;
    }

    if (update.revision <= scope.revision) return;

    scope.revision = update.revision;
    scope.targets.set(update.target.targetId, update.target);
  }

  private isCurrentSnapshot(value: unknown): value is AirTagScopeSnapshot {
    return isAirTagScopeSnapshot(value) && this.isCurrentMap(value);
  }

  private isCurrentMap(value: { world: string; mapId: number }): boolean {
    return (
      value.world === this.currentWorld && value.mapId === this.currentMapId
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
}

export const airTagReceiveController = new AirTagReceiveController();
