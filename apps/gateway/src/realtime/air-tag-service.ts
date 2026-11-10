import {
  AIR_TAG_MAP_THREAT_TTL_MS,
  AIR_TAG_MAX_BATCH_SIZE,
  AIR_TAG_MAX_MAP_NAME_LENGTH,
  isAirTagDeparture,
  isAirTagObservation,
  type AirTagDeparture,
  type AirTagObservationAck,
  type AirTagMapThreatEvent,
  type AirTagObservation,
  type AirTagSubscriptionAck,
  type AirTagScopeUpdateEvent,
} from "@lootlog/schema/air-tag";
import type { SubscriptionScope } from "@lootlog/protocol/realtime";
import { chunk } from "es-toolkit";
import {
  Context,
  Effect,
  Exit,
  Layer,
  Metric,
  Schedule,
  Semaphore,
} from "effect";
import { runLogEffect } from "@lootlog/instrumentation";
import { RealtimeStoreError, storeCall } from "#src/realtime/realtime-errors";
import { GatewayRedis } from "#src/platform/redis-store";
import { type RealtimeHub, Hub } from "#src/realtime/realtime-hub";
import type { AirTagScope, GatewaySocket } from "#src/realtime/session";
import {
  canReadPreciseLocation,
  canSubscribe,
} from "#src/realtime/subscription-policy";
import {
  orAccessDenied,
  type CommandRoutes,
} from "#src/realtime/command-routes";
import type { CommandAdmission } from "#src/realtime/command-admission";
import {
  THREAT_BROADCAST_THROTTLE_MS,
  admitBatch,
  admitConnectionBatch,
  takeThreatFlush,
  hashTag,
  interestKeyFor,
  loadMapThreat,
  loadScopeSnapshot,
  mergeObservations,
  readDisabledFlags,
  readThreatMapIds,
  registerReplicaInterest,
  threatMapsKey,
  type BatchAdmission,
  type MergeResult,
  type ScriptStore,
  type ThreatScope,
} from "#src/realtime/air-tag-store";

// A replica re-registers the scopes its sockets follow; a registration outlives
// two missed refreshes, and a stale one only costs an unneeded publication.
const INTEREST_REFRESH_MS = 30_000;

const INTEREST_BATCH_SIZE = 100;

const federatedUpdates = Metric.counter(
  "lootlog_gateway_air_tag_federated_updates_total",
  { incremental: true },
);

// Attributed once: deriving them on every batch costs more than the update.
const skippedFederatedUpdates = Metric.withAttributes(federatedUpdates, {
  outcome: "skipped",
});

const publishedFederatedUpdates = Metric.withAttributes(federatedUpdates, {
  outcome: "published",
});

const THREAT_PUBLISH_ATTEMPTS = 3;

const WORLD_PATTERN = /^[a-z0-9-]{1,64}$/i;

interface ObservationBatch {
  readonly expectedMapId: number;
  readonly observations: ReadonlyArray<AirTagObservation>;
  readonly departures?: ReadonlyArray<AirTagDeparture>;
}

/** Logs are annotated only when written: annotating costs on every batch. */
const warn = (message: string, cause: unknown) =>
  Effect.logWarning(message, cause).pipe(
    Effect.annotateLogs({ context: "AirTagService" }),
  );

const UNAVAILABLE = {
  status: "rejected",
  code: "temporarily-unavailable",
} as const;

export class AirTagService {
  /** Each socket's subscription changes one at a time, in the order it sent them. */
  private readonly subscriptionLocks = new WeakMap<
    GatewaySocket,
    Semaphore.Semaphore
  >();
  private readonly threatFlushes = new Map<
    string,
    ReturnType<typeof setTimeout>
  >();

  constructor(
    private readonly redis: ScriptStore,
    private readonly hub: Pick<
      RealtimeHub,
      | "subscribe"
      | "unsubscribe"
      | "publishToScopes"
      | "instanceId"
      | "getLocalScopes"
    >,
  ) {}

  updateSubscription(
    socket: GatewaySocket,
    payload: { requestId: string; enabled: boolean; expectedMapId?: number },
  ): Effect.Effect<AirTagSubscriptionAck> {
    return this.serialize(
      socket,
      Effect.suspend(() => this.performSubscriptionUpdate(socket, payload)),
    );
  }

  private performSubscriptionUpdate(
    socket: GatewaySocket,
    payload: { requestId: string; enabled: boolean; expectedMapId?: number },
  ): Effect.Effect<AirTagSubscriptionAck> {
    const { requestId } = payload;
    this.clearSubscription(socket);

    if (!payload.enabled)
      return Effect.succeed({ status: "accepted", requestId, scopes: [] });
    const context = this.getContext(socket, payload.expectedMapId);

    if (!context)
      return Effect.succeed({
        status: "rejected",
        requestId,
        code: "invalid-context",
      });

    const eligibleScopes = this.getEligibleScopes(
      socket,
      context.world,
      context.mapId,
    );

    if (eligibleScopes.length === 0)
      return Effect.succeed({
        status: "rejected",
        requestId,
        code: "forbidden",
      });

    const unavailable = {
      status: "rejected",
      requestId,
      code: "temporarily-unavailable",
    } as const;

    return readDisabledFlags(this.redis, eligibleScopes).pipe(
      Effect.flatMap((disabled) => {
        const enabledScopes = eligibleScopes.filter(
          (_, index) => disabled[index] !== "1",
        );

        if (enabledScopes.length === 0) return Effect.succeed(unavailable);

        return Effect.try({
          try: () => {
            socket.data.airTagScopes = enabledScopes;

            for (const scope of enabledScopes)
              this.hub.subscribe(socket, scope.subscription);
          },
          catch: (cause) =>
            new RealtimeStoreError({ operation: "air-tag.subscribe", cause }),
        }).pipe(
          Effect.andThen(
            Effect.forEach(
              enabledScopes,
              (scope) =>
                loadScopeSnapshot(this.redis, this.hub.instanceId, scope),
              {
                concurrency: "unbounded",
              },
            ),
          ),
          Effect.map((scopes): AirTagSubscriptionAck => ({
            status: "accepted",
            requestId,
            scopes,
          })),
        );
      }),
      Effect.catch((error) =>
        Effect.sync(() => this.clearSubscription(socket)).pipe(
          Effect.andThen(warn("Failed to load air tag snapshots", error)),
          Effect.as(unavailable),
        ),
      ),
    );
  }

  publishObservations(
    socket: GatewaySocket,
    payload: ObservationBatch,
  ): Effect.Effect<AirTagObservationAck, RealtimeStoreError> {
    if (!this.hasValidBatch(payload))
      return Effect.succeed({ status: "rejected", code: "invalid-payload" });
    const context = this.getContext(socket, payload.expectedMapId);

    if (!context)
      return Effect.succeed({ status: "rejected", code: "invalid-context" });

    const scopes = socket.data.airTagScopes.filter(
      (scope) =>
        scope.world === context.world &&
        scope.mapId === context.mapId &&
        canSubscribe(socket.data, scope.subscription),
    );

    if (scopes.length === 0)
      return Effect.succeed({ status: "rejected", code: "forbidden" });

    return this.admit(socket, scopes).pipe(
      Effect.flatMap(
        (
          admission,
        ): Effect.Effect<AirTagObservationAck, RealtimeStoreError> => {
          if (!admission) return Effect.succeed(UNAVAILABLE);

          if (admission.status === "rate-limited")
            return Effect.succeed({
              status: "rejected",
              code: "rate-limited",
              retryAfterMs: admission.retryAfterMs,
            });

          const observations = [
            ...new Map(
              payload.observations.map((item) => [item.targetId, item]),
            ).values(),
          ];

          const observedIds = new Set(
            observations.map((item) => item.targetId),
          );

          // A sighting in the same batch supersedes a departure.
          const departures = [
            ...new Map(
              (payload.departures ?? []).map((item) => [item.targetId, item]),
            ).values(),
          ].filter((item) => !observedIds.has(item.targetId));

          // Proof-checked characters only: a threat reaches the whole Organization's timers.
          const threatsAllowed =
            socket.data.confidence === "verified" &&
            context.mapName.length <= AIR_TAG_MAX_MAP_NAME_LENGTH;

          // Scopes are independent: a failed merge does not stop the others.
          // Forking costs more than a merge, and most observers share one scope.
          return Effect.forEach(
            admission.enabledScopes,
            (scope) =>
              mergeObservations(this.redis, this.hub.instanceId, scope, {
                observer: socket.data.connectionId,
                observations,
                departures,
                threatsAllowed,
                mapName: context.mapName,
              }).pipe(
                Effect.map((result) => ({ scope, result })),
                Effect.exit,
              ),
            {
              concurrency: admission.enabledScopes.length > 1 ? "unbounded" : 1,
            },
          ).pipe(
            Effect.flatMap((results) =>
              this.publishMerges(
                results,
                socket.data.connectionId,
                context.mapName,
              ),
            ),
          );
        },
      ),
    );
  }

  /** Publishes each merged scope's threat and changes, in scope order. */
  private publishMerges(
    results: ReadonlyArray<
      Exit.Exit<{ scope: AirTagScope; result: MergeResult }, RealtimeStoreError>
    >,
    observer: string,
    mapName: string,
  ): Effect.Effect<AirTagObservationAck, RealtimeStoreError> {
    const steps: Array<Effect.Effect<void, RealtimeStoreError>> = [];
    let acceptedScopes = 0;
    let acceptedTargets = 0;

    for (const merged of results) {
      if (Exit.isFailure(merged)) {
        steps.push(warn("Failed to merge air tag observations", merged.cause));
        continue;
      }

      const { scope, result } = merged.value;
      acceptedScopes += 1;
      acceptedTargets += result.acceptedTargets;

      if (result.threat) {
        const { revision, enemies } = result.threat;

        steps.push(
          this.publishThreat({
            guildId: scope.guildId,
            world: scope.world,
            mapId: scope.mapId,
            mapName,
            revision,
            enemies,
          }),
        );
      }

      const pendingMs = result.threatPendingMs;

      if (pendingMs !== undefined)
        steps.push(
          Effect.sync(() => this.scheduleThreatFlush(scope, pendingMs)),
        );

      if (result.targets.length > 0 || result.removed.length > 0)
        steps.push(
          this.publishScopeUpdate(scope, observer, result.remoteRecipients, {
            guildId: scope.guildId,
            world: scope.world,
            mapId: scope.mapId,
            epochId: result.epochId,
            epochStartedAt: result.epochStartedAt,
            revision: result.revision,
            targets: result.targets,
            removedTargetIds: result.removed,
          }),
        );
    }

    const outcome: AirTagObservationAck =
      acceptedScopes === 0
        ? UNAVAILABLE
        : { status: "accepted", acceptedScopes, acceptedTargets };

    return Effect.forEach(steps, (step) => step, { discard: true }).pipe(
      Effect.as(outcome),
    );
  }

  /** One publication per batch. */
  private publishScopeUpdate(
    scope: AirTagScope,
    excludeConnectionId: string,
    remoteRecipients: boolean,
    event: AirTagScopeUpdateEvent,
  ): Effect.Effect<void, RealtimeStoreError> {
    const localOnly = !remoteRecipients;

    return Metric.update(
      localOnly ? skippedFederatedUpdates : publishedFederatedUpdates,
      1,
    ).pipe(
      Effect.andThen(
        storeCall("air-tag.publish", () =>
          this.hub.publishToScopes(
            [scope.subscription],
            {
              v: 1,
              type: "air-tag.scope-updated",
              sequence: event.revision,
              data: event,
            },
            {
              excludeConnectionId,
              recipientPlatform: "game",
              recipientWorld: scope.world,
              recipientMapId: scope.mapId,
              localOnly,
            },
          ),
        ),
      ),
    );
  }

  /** Current map threats of one Organization and world, for a client that just connected. */
  fetchMapThreats(
    socket: GatewaySocket,
    organizationId: string,
    world: string,
  ): Effect.Effect<
    { threats: AirTagMapThreatEvent[] } | null,
    RealtimeStoreError
  > {
    if (
      !canSubscribe(socket.data, {
        topic: "organization.presence",
        organizationId,
      }) ||
      !canReadPreciseLocation(socket.data, organizationId) ||
      !WORLD_PATTERN.test(world)
    )
      return Effect.succeed(null);

    return readThreatMapIds(this.redis, organizationId, world).pipe(
      Effect.flatMap((mapIds) =>
        Effect.forEach(
          mapIds,
          (value) => {
            const mapId = Number(value);

            if (!Number.isInteger(mapId)) return Effect.succeed([]);

            return loadMapThreat(this.redis, {
              guildId: organizationId,
              world,
              mapId,
            });
          },
          { concurrency: "unbounded" },
        ),
      ),
      Effect.map((threats) => ({ threats: threats.flat() })),
    );
  }

  clearSubscription(socket: GatewaySocket): void {
    for (const scope of socket.data.airTagScopes)
      this.hub.unsubscribe(socket, scope.subscription);
    socket.data.airTagScopes = [];
  }

  private serialize<A, E>(
    socket: GatewaySocket,
    effect: Effect.Effect<A, E>,
  ): Effect.Effect<A, E> {
    let lock = this.subscriptionLocks.get(socket);

    if (!lock) {
      lock = Semaphore.makeUnsafe(1);
      this.subscriptionLocks.set(socket, lock);
    }

    return lock.withPermits(1)(effect);
  }

  private getContext(socket: GatewaySocket, expectedMapId: number | undefined) {
    const presence = socket.data.presence;
    const world = presence?.character?.world;

    if (
      socket.data.platform !== "game" ||
      expectedMapId === undefined ||
      presence?.location?.mapId !== expectedMapId ||
      !world ||
      !WORLD_PATTERN.test(world)
    )
      return null;

    return { world, mapId: expectedMapId, mapName: presence.location.map };
  }

  private getEligibleScopes(
    socket: GatewaySocket,
    world: string,
    mapId: number,
  ): AirTagScope[] {
    return socket.data.guilds.flatMap(({ guild }) => {
      const subscription = {
        topic: "map.air-tags" as const,
        organizationId: guild.id,
        world,
        mapId,
      };

      return canSubscribe(socket.data, subscription)
        ? [{ guildId: guild.id, world, mapId, subscription }]
        : [];
    });
  }

  private hasValidBatch(payload: ObservationBatch): boolean {
    const departures = payload.departures ?? [];

    return (
      Number.isInteger(payload.expectedMapId) &&
      payload.expectedMapId >= 0 &&
      payload.expectedMapId <= 65_535 &&
      payload.observations.length + departures.length > 0 &&
      payload.observations.length <= AIR_TAG_MAX_BATCH_SIZE &&
      departures.length <= AIR_TAG_MAX_BATCH_SIZE &&
      payload.observations.every(isAirTagObservation) &&
      departures.every(isAirTagDeparture)
    );
  }

  /**
   * Sends a list the throttle held back, or retries one that failed to go out,
   * even when the observer sends nothing more. Lives on this instance; a list
   * lost with it stays in Redis for `fetchMapThreats`.
   */
  private scheduleThreatFlush(
    scope: ThreatScope,
    delayMs: number,
    failedAttempts = 0,
  ): void {
    const flushKey = hashTag(scope);

    if (this.threatFlushes.has(flushKey)) return;

    this.threatFlushes.set(
      flushKey,
      setTimeout(
        () => {
          this.threatFlushes.delete(flushKey);
          runLogEffect(this.flushThreat(scope, failedAttempts));
        },
        Math.max(0, delayMs),
      ),
    );
  }

  private flushThreat(
    scope: ThreatScope,
    failedAttempts: number,
  ): Effect.Effect<void> {
    return takeThreatFlush(this.redis, scope, failedAttempts > 0).pipe(
      Effect.flatMap((flush) => {
        if (flush === undefined) return Effect.void;

        if ("retryInMs" in flush)
          return Effect.sync(() =>
            this.scheduleThreatFlush(scope, flush.retryInMs, failedAttempts),
          );

        return this.publishThreat(
          { ...scope, ...flush, enemies: [...flush.enemies] },
          failedAttempts,
        );
      }),
      Effect.catch((error) =>
        this.giveUpOrRetryThreat(scope, failedAttempts, error),
      ),
    );
  }

  /** Retries the list later, or logs once it has failed too often. */
  private giveUpOrRetryThreat(
    scope: ThreatScope,
    failedAttempts: number,
    error: RealtimeStoreError,
  ): Effect.Effect<void> {
    if (failedAttempts >= THREAT_PUBLISH_ATTEMPTS - 1)
      return warn("Gave up publishing map threat", error);

    return Effect.sync(() =>
      this.scheduleThreatFlush(
        scope,
        THREAT_BROADCAST_THROTTLE_MS * (failedAttempts + 1),
        failedAttempts + 1,
      ),
    );
  }

  private publishThreat(
    event: AirTagMapThreatEvent,
    failedAttempts = 0,
  ): Effect.Effect<void> {
    const threatMaps = threatMapsKey(event.guildId, event.world);

    // The live publish does not read the snapshot, which serves later
    // joiners, and a retry after a failed snapshot repeats the revisioned
    // event.
    return storeCall("air-tag.threat-publish", async () => {
      await Promise.all([
        this.redis.command
          .sadd(threatMaps, String(event.mapId))
          .then(() =>
            this.redis.command.expire(
              threatMaps,
              AIR_TAG_MAP_THREAT_TTL_MS / 1_000,
            ),
          ),
        this.hub.publishToScopes(
          [{ topic: "organization.presence", organizationId: event.guildId }],
          { v: 1, type: "air-tag.map-threat-updated", data: event },
          {
            // Any world: timers can show a world other than the recipient's own.
            recipientPlatform: "game",
            // A sighting reveals which map an observing member is on.
            organizationId: event.guildId,
            presenceAudience: "precise",
          },
        ),
      ]);
    }).pipe(
      // AirTag updates of the same batch must still go out; the list goes out again later.
      Effect.catch((error) =>
        this.giveUpOrRetryThreat(event, failedAttempts, error),
      ),
    );
  }

  /**
   * Registers this replica for a `map.air-tags` subscription made outside
   * `air-tag.subscription`, so later updates merged on other replicas reach it.
   */
  registerInterest(
    scope: SubscriptionScope,
  ): Effect.Effect<void, RealtimeStoreError> {
    return registerReplicaInterest(this.redis, this.hub.instanceId, [
      interestKeyFor(scope),
    ]);
  }

  /** Keeps this replica registered for every air-tag scope a local socket follows. */
  runInterestRefresh() {
    return Effect.suspend(() => this.refreshInterest()).pipe(
      Effect.catchCause((cause) =>
        warn("Air tag interest refresh failed", cause),
      ),
      Effect.repeat(Schedule.spaced(INTEREST_REFRESH_MS)),
    );
  }

  private refreshInterest(): Effect.Effect<void, RealtimeStoreError> {
    const keys = new Set(
      this.hub
        .getLocalScopes("map.air-tags")
        .map((scope) => interestKeyFor(scope)),
    );

    return Effect.forEach(
      chunk([...keys], INTEREST_BATCH_SIZE),
      (batch) =>
        registerReplicaInterest(this.redis, this.hub.instanceId, batch),
      { concurrency: "unbounded", discard: true },
    );
  }

  /** The batch's rate-limit verdict and enabled scopes, or null when Redis cannot decide. */
  private admit(
    socket: GatewaySocket,
    scopes: ReadonlyArray<AirTagScope>,
  ): Effect.Effect<BatchAdmission | null> {
    const connection = admitConnectionBatch(socket.data, Date.now());

    if (!connection.admitted)
      return Effect.succeed<BatchAdmission>({
        status: "rate-limited",
        retryAfterMs: connection.retryAfterMs,
      });

    return admitBatch(this.redis, socket.data.userId, scopes).pipe(
      Effect.catch((error) =>
        warn("Failed to admit air tag observations", error).pipe(
          Effect.as(null),
        ),
      ),
    );
  }
}

/** AirTag observations, their scopes and map threats, with the interest refresh. */
export class AirTags extends Context.Service<AirTags, AirTagService>()(
  "@lootlog/gateway/realtime/AirTags",
) {
  static readonly layer = Layer.effect(
    AirTags,
    Effect.gen(function* () {
      const airTags = new AirTagService(yield* GatewayRedis, yield* Hub);

      yield* airTags.runInterestRefresh().pipe(Effect.forkScoped);

      return airTags;
    }),
  );
}

export const airTagRoutes = (
  airTags: Pick<
    AirTagService,
    "updateSubscription" | "publishObservations" | "fetchMapThreats"
  >,
  observationAdmission: Pick<CommandAdmission, "tryAcquire">,
) =>
  ({
    "air-tag.subscription": {
      joined: true,
      run: (socket, data) => airTags.updateSubscription(socket, data),
    },
    "air-tag.observation": {
      joined: true,
      run: (socket, data) =>
        Effect.suspend(() => {
          const admission = observationAdmission.tryAcquire();

          // A rejected batch loses nothing: the client merges it into its next one.
          if (!admission.admitted)
            return Effect.succeed<AirTagObservationAck>({
              status: "rejected",
              code: "rate-limited",
              retryAfterMs: admission.retryAfterMs,
            });

          return airTags
            .publishObservations(socket, data)
            .pipe(Effect.ensuring(Effect.sync(admission.release)));
        }),
    },
    "air-tag.map-threats.fetch": {
      joined: true,
      run: (socket, { organizationId, world }) =>
        orAccessDenied(airTags.fetchMapThreats(socket, organizationId, world)),
    },
  }) satisfies Pick<
    CommandRoutes,
    "air-tag.subscription" | "air-tag.observation" | "air-tag.map-threats.fetch"
  >;
