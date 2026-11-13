import { recordRealtimeCommand } from "#src/realtime/connection-metrics";
import {
  runCommandRoute,
  type CommandRoutes,
} from "#src/realtime/command-routes";
import { diffAccessPolicies } from "@lootlog/protocol/realtime/access-policy";
import {
  announceAccess,
  scopedGuilds,
  sessionAccessPolicy,
} from "#src/realtime/session-access";
import { parseRealtimeJson } from "@lootlog/protocol/realtime/codec";
import {
  CHARACTER_AURAS_FEATURE,
  KILL_STATS_FEATURE,
  decodeClientCommand,
  type ClientCommand,
  type CommandSuccess,
  type Response,
  type ServerEvent,
  type SubscriptionScope,
} from "@lootlog/protocol/realtime";
import type { MargonemAccountVerifiedV1 } from "@lootlog/protocol/rabbit/events";
import {
  Cause,
  Clock,
  Effect,
  Exit,
  Function,
  Option,
  Schedule,
  Schema,
  Context,
  Layer,
} from "effect";
import {
  type GuildStore,
  type GuildStoreFailure,
  Guilds,
} from "#src/guilds/guild-store";
import {
  type MargonemProofVerifier,
  ProofVerifier,
} from "#src/auth/margonem-proof";
import {
  type ActivityPublisher,
  Activity,
} from "#src/rabbit/activity-publisher";
import {
  type AirTagService,
  AirTags,
  airTagRoutes,
} from "#src/realtime/air-tag-service";
import {
  BattlePings,
  battlePingRoutes,
} from "#src/realtime/battle-ping-service";
import { LootSplits, lootSplitRoutes } from "#src/realtime/loot-split-service";
import {
  type NpcPresenceService,
  NpcPresence,
  npcPresenceRoutes,
} from "#src/realtime/npc-presence-service";
import {
  CommandAdmission,
  JOIN_ADMISSION_LIMITS,
  CommandAdmissions,
} from "#src/realtime/command-admission";
import { MapPings, mapPingRoutes } from "#src/realtime/map-ping-service";
import { getGlobalChatStats } from "#src/realtime/gateway-metrics";
import { canReadSourceEvent } from "#src/realtime/source-event-visibility";
import { type PresenceStore, Presence } from "#src/realtime/presence-store";
import { type RealtimeHub, Hub } from "#src/realtime/realtime-hub";
import {
  hasValidApiKeyLease,
  type GatewaySocket,
  type SessionData,
} from "#src/realtime/session";
import {
  commandFailureDetails,
  GameCharacterRequired,
  isCommandFailure,
  JoinCapacityExceeded,
  NoAuthorizedOrganizations,
  OrganizationAccessDenied,
  RealtimeDependencyError,
  type CommandFailure,
  SessionNotJoined,
  SubscriptionLimitExceeded,
} from "#src/realtime/realtime-errors";
import {
  canSubscribe,
  defaultScopes,
  organizationIds,
} from "#src/realtime/subscription-policy";
import { RabbitMessaging } from "@lootlog/messaging";
import { RabbitRoutingKey } from "@lootlog/protocol/rabbit/topology";

type Command = typeof ClientCommand.Type;

type Scope = typeof SubscriptionScope.Type;

type Event = typeof ServerEvent.Type;

type RealtimeResponse = typeof Response.Type;

const permissionRebalanceRetry = Schedule.max([
  Schedule.exponential("250 millis"),
  Schedule.recurs(3),
]);

// Bounds how long unconfirmed authority survives a failing permission lookup.
const PERMISSION_REBALANCE_DEADLINE = "30 seconds";

const errorResponse = (
  requestId: string,
  code: string,
  message: string,
  retryable = false,
  retryAfterMs?: number,
): RealtimeResponse => {
  const error = { code, message, retryable };

  // The frame schema rejects an undefined field.
  return {
    v: 1,
    requestId,
    status: "error",
    error: retryAfterMs === undefined ? error : { ...error, retryAfterMs },
  };
};

// Ping, loot split and AirTag acks have a rejection for an invalid payload, so
// a malformed one of those is answered instead of closing the socket.
const invalidPayloadRejection = Function.compose(
  Schema.decodeUnknownOption(
    Schema.Struct({
      v: Schema.Literal(1),
      requestId: Schema.NonEmptyString,
      type: Schema.Literals([
        "map-ping.send",
        "battle-ping.send",
        "loot-split.send",
        "loot-split.auto-accept",
        "air-tag.observation",
      ]),
    }),
  ),
  Option.match({
    onNone: (): RealtimeResponse | null => null,
    onSome: (input): RealtimeResponse => ({
      v: 1,
      requestId: input.requestId,
      status: "success",
      data: { status: "rejected", code: "invalid-payload" },
    }),
  }),
);

/** Commands of the session itself; every other route belongs to a feature. */
type SessionCommand =
  | "session.join"
  | "presence.heartbeat"
  | "connection.ping"
  | "presence.publish"
  | "presence.fetch"
  | "subscription.subscribe"
  | "subscription.unsubscribe";

export type FeatureRoutes = Omit<CommandRoutes, SessionCommand>;

/** Every feature's routes; a feature command without one does not compile. */
export const gatewayFeatureRoutes = (features: {
  readonly mapPings: Parameters<typeof mapPingRoutes>[0];
  readonly battlePings: Parameters<typeof battlePingRoutes>[0];
  readonly lootSplits: Parameters<typeof lootSplitRoutes>[0];
  readonly airTags: Parameters<typeof airTagRoutes>[0];
  readonly airTagObservationAdmission: Parameters<typeof airTagRoutes>[1];
  readonly npcPresence: Parameters<typeof npcPresenceRoutes>[0];
}): FeatureRoutes => ({
  ...mapPingRoutes(features.mapPings),
  ...battlePingRoutes(features.battlePings),
  ...lootSplitRoutes(features.lootSplits),
  ...airTagRoutes(features.airTags, features.airTagObservationAdmission),
  ...npcPresenceRoutes(features.npcPresence),
});

export class CommandHandler {
  private readonly routes: CommandRoutes;

  constructor(
    private readonly guilds: GuildStore,
    private readonly proofVerifier: MargonemProofVerifier,
    private readonly publishAccountVerified: (
      event: MargonemAccountVerifiedV1,
    ) => Effect.Effect<void, unknown>,
    private readonly presence: Pick<
      PresenceStore,
      "heartbeat" | "publish" | "snapshot" | "reconcileAccess"
    >,
    private readonly hub: Pick<
      RealtimeHub,
      | "onPermissionRebalance"
      | "globalChatCounts"
      | "sendResponse"
      | "sendEvent"
      | "replaceSubscriptions"
      | "setPresence"
      | "getLocalSocketsForUser"
      | "publishPermissionRebalance"
      | "reconnectUser"
      | "subscribe"
      | "unsubscribe"
    >,
    private readonly activity: Pick<ActivityPublisher, "publish">,
    /** Features that follow the session's heartbeats, joins and subscriptions. */
    private readonly sessionFeatures: {
      readonly npcPresence: Pick<NpcPresenceService, "refresh" | "withdraw">;
      readonly airTags: Pick<AirTagService, "registerInterest">;
    },
    featureRoutes: FeatureRoutes,
    private readonly joinAdmission: Pick<
      CommandAdmission,
      "tryAcquire"
    > = new CommandAdmission(JOIN_ADMISSION_LIMITS),
  ) {
    this.routes = { ...this.sessionRoutes(), ...featureRoutes };
    this.hub.onPermissionRebalance((discordId, userId) =>
      this.enforceRebalance(discordId, userId),
    );
  }

  handle(socket: GatewaySocket, input: string | Buffer): Effect.Effect<void> {
    return this.process(socket, input, false);
  }

  rejectOverloaded(socket: GatewaySocket, input: string | Buffer): void {
    // Admission rejection must not allocate a background fiber or start I/O.
    Effect.runSync(this.process(socket, input, true));
  }

  private process(
    socket: GatewaySocket,
    input: string | Buffer,
    overloaded: boolean,
  ): Effect.Effect<void> {
    if (!hasValidApiKeyLease(socket.data))
      return Effect.sync(() =>
        socket.close(1008, "API key authorization expired"),
      );
    let decoded: unknown;

    if (Buffer.isBuffer(input))
      return Effect.sync(() => socket.close(1003, "text JSON frames required"));

    try {
      decoded = parseRealtimeJson(input);
    } catch {
      return Effect.sync(() => socket.close(1007, "malformed realtime frame"));
    }

    let command: Command;

    try {
      command = decodeClientCommand(decoded);
    } catch {
      const rejection = invalidPayloadRejection(decoded);

      if (rejection) {
        return Effect.sync(() => {
          this.hub.sendResponse(socket, rejection);
        });
      }

      return Effect.sync(() => socket.close(1007, "malformed realtime frame"));
    }

    if (overloaded) {
      return Effect.sync(() => {
        this.hub.sendResponse(
          socket,
          errorResponse(
            command.requestId,
            "COMMAND_REJECTED",
            "command temporarily unavailable",
            true,
          ),
        );
      });
    }

    const dispatch = Effect.suspend(() => this.dispatch(socket, command)).pipe(
      Effect.tap((data) =>
        Effect.sync(() => {
          this.hub.sendResponse(socket, {
            v: 1,
            requestId: command.requestId,
            status: "success",
            data,
          });
        }),
      ),
      Effect.onExit((exit) => {
        if (Exit.isSuccess(exit))
          return recordRealtimeCommand(command.type, "success");

        if (Cause.hasDies(exit.cause))
          return recordRealtimeCommand(command.type, "defect");

        if (Cause.hasInterruptsOnly(exit.cause))
          return recordRealtimeCommand(command.type, "interrupted");

        const error = Option.getOrUndefined(Cause.findErrorOption(exit.cause));

        const retryable =
          !isCommandFailure(error) || commandFailureDetails(error).retryable;

        return recordRealtimeCommand(
          command.type,
          retryable ? "retryable" : "rejected",
        );
      }),
    );

    const traced = this.routes[command.type].traced
      ? dispatch.pipe(
          Effect.withSpan("gateway.command", {
            attributes: { "rpc.method": command.type },
          }),
        )
      : dispatch;

    return traced.pipe(
      Effect.catchCause((cause) => {
        if (Cause.hasInterruptsOnly(cause)) return Effect.interrupt;
        const error = Option.getOrUndefined(Cause.findErrorOption(cause));

        const failure = isCommandFailure(error)
          ? commandFailureDetails(error)
          : { message: "command temporarily unavailable", retryable: true };

        const respond = Effect.sync(() => {
          this.hub.sendResponse(
            socket,
            errorResponse(
              command.requestId,
              "COMMAND_REJECTED",
              failure.message,
              failure.retryable,
              failure.retryAfterMs,
            ),
          );
        });

        // A defect still fails the command, but its client learns to retry
        // instead of waiting for the request to time out.
        return Cause.hasDies(cause)
          ? respond.pipe(Effect.andThen(Effect.die(Cause.squash(cause))))
          : respond;
      }),
      Effect.asVoid,
    );
  }

  rebalanceUser(
    discordId: string,
    userId: string,
  ): Effect.Effect<void, GuildStoreFailure> {
    return Effect.gen({ self: this }, function* () {
      if (
        !this.hub
          .getLocalSocketsForUser(userId)
          .some((socket) => socket.data.discordId === discordId)
      )
        return;

      const updatedGuilds = yield* this.guilds.getUserGuilds(
        { discordId, userId },
        { freshness: "required" },
      );

      yield* this.commitAccess(discordId, userId, (session) =>
        scopedGuilds(session, updatedGuilds),
      );
    });
  }

  rebalanceAcrossInstances(
    discordId: string,
    userId: string,
    removedOrganizationId?: string,
  ): Effect.Effect<void, unknown> {
    return Effect.gen({ self: this }, function* () {
      // A confirmed removal needs no permission lookup, so revoke it before any I/O.
      const cleanup =
        removedOrganizationId === undefined
          ? Effect.void
          : this.commitAccess(discordId, userId, (session) =>
              session.guilds.filter(
                ({ guild }) => guild.id !== removedOrganizationId,
              ),
            );

      // A failed cache invalidation or publication must not prevent revocation.
      // Preserve failures for Rabbit redelivery after attempting every boundary.
      const federate = Effect.gen({ self: this }, function* () {
        const invalidated = yield* Effect.exit(
          this.guilds.invalidate({ discordId, userId }),
        );

        const [published] = yield* Effect.all(
          [
            Effect.exit(this.hub.publishPermissionRebalance(discordId, userId)),
            this.enforceRebalance(discordId, userId),
          ],
          { concurrency: 2 },
        );

        return [invalidated, published];
      });

      const [, results] = yield* Effect.all([cleanup, federate], {
        concurrency: 2,
      });

      for (const result of results) {
        if (Exit.isFailure(result))
          return yield* Effect.failCause(result.cause);
      }
    });
  }

  private enforceRebalance(
    discordId: string,
    userId: string,
  ): Effect.Effect<void> {
    return this.rebalanceUser(discordId, userId).pipe(
      Effect.retry({
        schedule: permissionRebalanceRetry,
        while: (error) => error.retryable,
      }),
      Effect.timeout(PERMISSION_REBALANCE_DEADLINE),
      // Sockets must not keep authority that could not be confirmed.
      // The invalidated cache makes their next session.join fail closed.
      Effect.catch((error) =>
        Effect.logError(
          "Permission rebalance unavailable; reconnecting affected sockets",
          error,
        ).pipe(
          Effect.andThen(
            Effect.sync(() => this.hub.reconnectUser(discordId, userId)),
          ),
        ),
      ),
    );
  }

  // Commit every local socket's authority before yielding to external I/O.
  private commitAccess(
    discordId: string,
    userId: string,
    nextGuilds: (session: SessionData) => SessionData["guilds"],
  ): Effect.Effect<void> {
    const { activity, hub, presence } = this;

    return Effect.suspend(() => {
      const sideEffects: Array<Effect.Effect<void>> = [];

      for (const socket of hub.getLocalSocketsForUser(userId)) {
        if (socket.data.discordId !== discordId) continue;
        const allowedGuilds = nextGuilds(socket.data);
        const previousPolicy = sessionAccessPolicy(socket.data);

        const accessPolicy = sessionAccessPolicy({
          ...socket.data,
          guilds: allowedGuilds,
        });

        const changes = diffAccessPolicies(previousPolicy, accessPolicy);
        socket.data.guilds = allowedGuilds;

        if (changes.length === 0) continue;
        const updatedIds = new Set(allowedGuilds.map(({ guild }) => guild.id));

        const removedIds = previousPolicy.organizations
          .map(({ organizationId }) => organizationId)
          .filter((id) => !updatedIds.has(id));

        const announced = announceAccess(hub, socket, accessPolicy, changes);
        sideEffects.push(...announced.warnings);

        if (!announced.resubscribed) continue;

        if (!socket.data.apiKeyAccess) {
          if (removedIds.length > 0) {
            sideEffects.push(
              Effect.suspend(() =>
                activity.publish("DISCONNECT_EVENT", socket.data, removedIds),
              ).pipe(
                Effect.catchCause((cause) =>
                  Effect.logWarning(
                    "Permission disconnect activity failed",
                    cause,
                  ),
                ),
              ),
            );
          }

          sideEffects.push(
            Effect.suspend(() => presence.reconcileAccess(socket)).pipe(
              Effect.catchCause((cause) =>
                Effect.logWarning(
                  "Permission presence reconciliation failed",
                  cause,
                ),
              ),
            ),
          );
        }

        if (allowedGuilds.length === 0) {
          if (socket.data.apiKeyAccess) socket.data.apiKeyLeaseExpiresAt = 0;
          socket.close(1008, "organization access removed");
        }
      }

      return Effect.all(sideEffects, { concurrency: 8, discard: true });
    });
  }

  /**
   * A game session reads presence only where it publishes its own, so a
   * publication that changes those Lootlogs changes its access as well.
   */
  private publishPresence(
    socket: GatewaySocket,
    data: Extract<Command, { type: "presence.publish" }>["data"],
  ) {
    return Effect.suspend(() => {
      const previousPolicy = sessionAccessPolicy(socket.data);

      const previouslyPublished = new Set(
        socket.data.presence?.organizationIds ?? [],
      );

      return this.presence.publish(socket, data).pipe(
        Effect.onExit((exit) =>
          Effect.suspend(() => {
            const current = socket.data.presence;

            // A failed write may have stored only some of the requested
            // Lootlogs, so it opens none of them; reads stay where the
            // session was already visible. Partial records expire.
            if (Exit.isFailure(exit) && current) {
              const kept = current.organizationIds.filter((id) =>
                previouslyPublished.has(id),
              );

              this.hub.setPresence(
                socket,
                kept.length === 0
                  ? undefined
                  : { ...current, organizationIds: kept },
              );
            }

            const accessPolicy = sessionAccessPolicy(socket.data);
            const changes = diffAccessPolicies(previousPolicy, accessPolicy);

            const warnings =
              changes.length === 0
                ? []
                : announceAccess(this.hub, socket, accessPolicy, changes)
                    .warnings;

            return Effect.all(
              [...warnings, this.recordPresenceActivity(socket)],
              { discard: true },
            );
          }),
        ),
      );
    });
  }

  /** The activity log of a Lootlog follows where a character is visible. */
  private recordPresenceActivity(socket: GatewaySocket): Effect.Effect<void> {
    if (socket.data.platform !== "game" || socket.data.apiKeyAccess)
      return Effect.void;
    const published = socket.data.presence?.organizationIds ?? [];

    const hidden = (socket.data.activityOrganizationIds ?? []).filter(
      (id) => !published.includes(id),
    );

    return Effect.all(
      [
        this.activity.publish("DISCONNECT_EVENT", socket.data, hidden),
        this.activity.publish("CONNECT_EVENT", socket.data, published),
      ],
      { discard: true },
    );
  }

  private dispatch(
    socket: GatewaySocket,
    command: Command,
  ): Effect.Effect<CommandSuccess<Command["type"]>, CommandFailure> {
    if (!hasValidApiKeyLease(socket.data))
      return Effect.fail(new OrganizationAccessDenied());

    // Its authority may predate a lost revocation until the socket closes.
    if (socket.data.closing)
      return Effect.fail(
        new RealtimeDependencyError({
          operation: command.type,
          cause: "session is closing",
        }),
      );

    const route = this.routes[command.type];

    if (socket.data.apiKeyAccess && !route.apiKey)
      return Effect.fail(new OrganizationAccessDenied());

    if (route.joined && !socket.data.joined)
      return Effect.fail(new SessionNotJoined());

    return runCommandRoute(this.routes, socket, command.type, command.data);
  }

  private sessionRoutes(): Pick<CommandRoutes, SessionCommand> {
    const { hub, presence, sessionFeatures } = this;

    return {
      "session.join": {
        joined: false,
        apiKey: true,
        traced: true,
        run: (socket, data) =>
          Effect.suspend(() => {
            const admission = this.joinAdmission.tryAcquire();

            if (!admission.admitted)
              return Effect.fail(
                new JoinCapacityExceeded({
                  retryAfterMs: admission.retryAfterMs,
                }),
              );

            return this.join(socket, data).pipe(
              Effect.ensuring(Effect.sync(admission.release)),
            );
          }),
      },
      "presence.heartbeat": {
        joined: true,
        run: (socket, { sessionId }) =>
          presence.heartbeat(socket, sessionId).pipe(
            // The heartbeat must not wait for Redis scripts it does not need.
            // Forking costs as much as the heartbeat, so only sockets with
            // reports pay for it.
            Effect.tap(() =>
              socket.data.npcPresence
                ? Effect.forkDetach(sessionFeatures.npcPresence.refresh(socket))
                : Effect.void,
            ),
            Effect.map((lastSeen) => ({ lastSeen })),
          ),
      },
      // Answered without I/O, so the round trip measures only the connection.
      "connection.ping": {
        joined: false,
        apiKey: true,
        run: () => Effect.succeed({}),
      },
      "presence.publish": {
        joined: true,
        traced: true,
        run: (socket, data) => this.publishPresence(socket, data),
      },
      // Access is refused before the join check, as for subscriptions.
      "presence.fetch": {
        joined: false,
        apiKey: true,
        run: (socket, data) => {
          const scope = {
            topic: "organization.presence",
            organizationId: data.organizationId,
          } satisfies Scope;

          if (!canSubscribe(socket.data, scope))
            return Effect.fail(new OrganizationAccessDenied());

          return this.requireJoined(socket).pipe(
            Effect.andThen(
              presence.snapshot(socket.data, data.organizationId, data.world),
            ),
            Effect.tap((snapshot) =>
              Effect.sync(() => {
                if (data.delivery === "response") return;

                hub.sendEvent(socket, {
                  v: 1,
                  type: "presence.snapshot",
                  sequence: snapshot.revision,
                  data: snapshot,
                });
              }),
            ),
          );
        },
      },
      "subscription.subscribe": {
        joined: false,
        apiKey: true,
        run: (socket, scope) => {
          if (!canSubscribe(socket.data, scope))
            return Effect.fail(new OrganizationAccessDenied());

          return this.requireJoined(socket).pipe(
            Effect.andThen(
              Effect.try({
                try: () => {
                  hub.subscribe(socket, scope);

                  return { scope };
                },
                catch: (cause) =>
                  cause instanceof SubscriptionLimitExceeded
                    ? cause
                    : new RealtimeDependencyError({
                        operation: "subscribe",
                        cause,
                      }),
              }),
            ),
            // Other replicas publish air-tag updates only to registered followers.
            Effect.tap(() =>
              scope.topic === "map.air-tags"
                ? sessionFeatures.airTags.registerInterest(scope)
                : Effect.void,
            ),
            // Counts otherwise arrive with the next metrics sample, up to 10 s later.
            Effect.tap(() =>
              Effect.sync(() => {
                const counts = hub.globalChatCounts;

                if (
                  !counts ||
                  (scope.topic !== "global.chat" &&
                    scope.topic !== "global.chat.world")
                )
                  return;

                const event: Event = {
                  v: 1,
                  type: "global-chat.stats",
                  data: getGlobalChatStats(counts, scope.world),
                };

                if (canReadSourceEvent(socket.data, event))
                  hub.sendEvent(socket, event);
              }),
            ),
          );
        },
      },
      "subscription.unsubscribe": {
        joined: true,
        apiKey: true,
        run: (socket, scope) =>
          Effect.sync(() => {
            hub.unsubscribe(socket, scope);

            return { scope };
          }),
      },
    };
  }

  /** Reports belong to the character and world that saw the NPCs. */
  private withdrawNpcPresenceOnCharacterChange(
    socket: GatewaySocket,
    character: Extract<Command, { type: "session.join" }>["data"]["character"],
  ): Effect.Effect<void> {
    const state = socket.data.npcPresence;

    if (
      !state ||
      (state.world === character?.world &&
        state.characterId === character?.characterId)
    )
      return Effect.void;

    return this.sessionFeatures.npcPresence
      .withdraw(socket)
      .pipe(
        Effect.catch(() => Effect.logWarning("NPC presence withdraw failed")),
      );
  }

  private join(
    socket: GatewaySocket,
    data: Extract<Command, { type: "session.join" }>["data"],
  ): Effect.Effect<CommandSuccess<"session.join">, CommandFailure> {
    const {
      activity,
      guilds,
      hub,
      presence,
      proofVerifier,
      publishAccountVerified,
    } = this;

    const withdrawNpcPresence =
      this.withdrawNpcPresenceOnCharacterChange.bind(this);

    return Effect.gen(function* () {
      const wasJoined = socket.data.joined;

      if (socket.data.platform === "game" && !data.character)
        return yield* Effect.fail(new GameCharacterRequired());

      if (
        socket.data.apiKeyAccess &&
        (data.character || data.margonemAccountProof)
      )
        return yield* Effect.fail(new OrganizationAccessDenied());

      // The session keeps its current identity until every fallible step
      // has passed, so a failed re-join leaves it as it was.
      let confidence: SessionData["confidence"] = "reported";
      let announceVerified: Effect.Effect<void> = Effect.void;

      if (data.character) {
        const verification = yield* proofVerifier.verify({
          proof: data.margonemAccountProof,
          socketId: socket.data.connectionId,
          accountId: data.character.accountId,
          characterId: data.character.characterId,
          clanId: data.character.clan?.id,
        });

        if (verification.valid) {
          confidence = "verified";

          // Other services trust account ownership only from this fact.
          announceVerified = publishAccountVerified({
            version: 1,
            userId: socket.data.userId,
            accountId: data.character.accountId,
            characterId: data.character.characterId,
            world: data.character.world,
            verifiedAt: new Date(yield* Clock.currentTimeMillis).toISOString(),
          }).pipe(
            // A stalled broker must not hold the join.
            Effect.timeout("5 seconds"),
            Effect.catchCause((cause) =>
              Effect.logError(
                "Gateway account verification publish failed",
                cause,
              ),
            ),
          );
        }
      }

      // The fact is published whether or not the guild read succeeds.
      const [, userGuildsResult] = yield* Effect.all(
        [announceVerified, Effect.result(guilds.getUserGuilds(socket.data))],
        { concurrency: "unbounded" },
      );

      const userGuilds = yield* Effect.fromResult(userGuildsResult);
      yield* withdrawNpcPresence(socket, data.character);
      socket.data.character = data.character;
      socket.data.confidence = confidence;
      const authorizedGuilds = scopedGuilds(socket.data, userGuilds);

      if (authorizedGuilds.length === 0) {
        const previousPolicy = sessionAccessPolicy(socket.data);
        socket.data.guilds = [];
        socket.data.joined = false;
        socket.data.airTagScopes = [];
        hub.replaceSubscriptions(socket, []);
        const accessPolicy = sessionAccessPolicy(socket.data);
        // A new connection may have no server baseline while the client retains old cached data.
        hub.sendEvent(socket, {
          v: 1,
          type: "permissions.updated",
          data: {
            organizationIds: [],
            subscriptionScopes: [],
            accessPolicy,
            changes: diffAccessPolicies(previousPolicy, accessPolicy),
          },
        });

        if (wasJoined && !socket.data.apiKeyAccess) {
          yield* activity.publish(
            "DISCONNECT_EVENT",
            socket.data,
            previousPolicy.organizations.map(
              ({ organizationId }) => organizationId,
            ),
          );
        }

        yield* presence
          .reconcileAccess(socket)
          .pipe(
            Effect.catch(() =>
              Effect.logWarning(
                "Presence reconciliation failed after organization access was removed",
              ),
            ),
          );
        hub.setPresence(socket, undefined);

        return yield* Effect.fail(new NoAuthorizedOrganizations());
      }

      socket.data.guilds = authorizedGuilds;
      socket.data.characterAuras =
        data.features?.includes(CHARACTER_AURAS_FEATURE) === true;
      socket.data.killStats =
        data.features?.includes(KILL_STATS_FEATURE) === true;
      socket.data.joined = true;
      const scopes = defaultScopes(socket.data);
      yield* Effect.try({
        try: () => hub.replaceSubscriptions(socket, scopes),
        catch: (cause) =>
          cause instanceof SubscriptionLimitExceeded
            ? cause
            : new RealtimeDependencyError({
                operation: "replaceSubscriptions",
                cause,
              }),
      });

      const event = {
        v: 1,
        type: "session.joined",
        data: {
          connectionId: socket.data.connectionId,
          accessPolicy: sessionAccessPolicy(socket.data),
          organizationIds: organizationIds(socket.data),
          subscriptionScopes: scopes,
        },
      } satisfies Event;

      hub.sendEvent(socket, event);

      // A game session connects to a Lootlog when it starts publishing
      // presence there, so a Lootlog never logs a character hidden from it.
      if (
        !wasJoined &&
        !socket.data.apiKeyAccess &&
        socket.data.platform !== "game"
      )
        yield* activity.publish("CONNECT_EVENT", socket.data);

      return event.data;
    }).pipe(
      Effect.mapError((cause) =>
        isCommandFailure(cause)
          ? cause
          : new RealtimeDependencyError({ operation: "session.join", cause }),
      ),
    );
  }

  private requireJoined(
    socket: GatewaySocket,
  ): Effect.Effect<void, SessionNotJoined> {
    return socket.data.joined
      ? Effect.void
      : Effect.fail(new SessionNotJoined());
  }
}

/** Decodes and runs the commands of this replica's sessions. */
export class Commands extends Context.Service<Commands, CommandHandler>()(
  "@lootlog/gateway/realtime/Commands",
) {
  static readonly layer = Layer.effect(
    Commands,
    Effect.gen(function* () {
      const messaging = yield* RabbitMessaging;
      const admissions = yield* CommandAdmissions;
      const airTags = yield* AirTags;
      const npcPresence = yield* NpcPresence;

      return new CommandHandler(
        yield* Guilds,
        yield* ProofVerifier,
        (event) =>
          messaging
            .publish({
              routingKey: RabbitRoutingKey.MARGONEM_ACCOUNT_VERIFIED_V1,
              content: new TextEncoder().encode(JSON.stringify(event)),
            })
            .pipe(Effect.asVoid),
        yield* Presence,
        yield* Hub,
        yield* Activity,
        { npcPresence, airTags },
        gatewayFeatureRoutes({
          mapPings: yield* MapPings,
          battlePings: yield* BattlePings,
          lootSplits: yield* LootSplits,
          airTags,
          airTagObservationAdmission: admissions.airTagObservations,
          npcPresence,
        }),
        admissions.joins,
      );
    }),
  );
}
