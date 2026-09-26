import { recordRealtimeCommand } from "#src/realtime/connection-metrics";
import { createHash } from "node:crypto";
import {
  createAccessPolicySnapshot,
  diffAccessPolicies,
} from "@lootlog/protocol/realtime/access-policy";
import { decode } from "@msgpack/msgpack";
import {
  decodeClientCommand,
  REALTIME_PING_CAPABILITY,
  type ClientCommand,
  type Response,
  type ServerEvent,
  type SubscriptionScope,
} from "@lootlog/protocol/realtime";
import {
  Cause,
  Effect,
  Exit,
  Function,
  Option,
  Schedule,
  Schema,
} from "effect";
import type { GuildStore, GuildStoreFailure } from "#src/guilds/guild-store";
import type { MargonemProofVerifier } from "#src/auth/margonem-proof";
import type { ActivityPublisher } from "#src/rabbit/activity-publisher";
import type { AirTagService } from "#src/realtime/air-tag-service";
import type { MapPingService } from "#src/realtime/map-ping-service";
import type { PresenceStore } from "#src/realtime/presence-store";
import { getScopeKey, type RealtimeHub } from "#src/realtime/realtime-hub";
import {
  hasValidApiKeyLease,
  type GatewaySocket,
  type SessionData,
} from "#src/realtime/session";
import {
  commandFailureDetails,
  GameCharacterRequired,
  isCommandFailure,
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

const scopedGuilds = (
  session: SessionData,
  guilds: SessionData["guilds"],
): SessionData["guilds"] => {
  const access = session.apiKeyAccess;

  return access
    ? guilds.filter(({ guild }) => access.organizationIds.includes(guild.id))
    : guilds;
};

const sessionAccessPolicy = (
  session: Pick<SessionData, "guilds" | "discordId">,
) => {
  const snapshot = createAccessPolicySnapshot(
    session.guilds,
    session.discordId,
  );

  return {
    ...snapshot,
    version: createHash("sha256").update(snapshot.version).digest("hex"),
  };
};

const errorResponse = (
  requestId: string,
  code: string,
  message: string,
  retryable = false,
): RealtimeResponse => ({
  v: 1,
  requestId,
  status: "error",
  error: { code, message, retryable },
});

const invalidLegacyPayloadResponse = Function.compose(
  Schema.decodeUnknownOption(
    Schema.Struct({
      v: Schema.Literal(1),
      requestId: Schema.NonEmptyString,
      type: Schema.Literals(["map-ping.send", "air-tag.observation"]),
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

export class CommandHandler {
  constructor(
    private readonly guilds: GuildStore,
    private readonly proofVerifier: MargonemProofVerifier,
    private readonly presence: Pick<
      PresenceStore,
      "heartbeat" | "publish" | "snapshot" | "reconcileAccess"
    >,
    private readonly hub: Pick<
      RealtimeHub,
      | "onPermissionRebalance"
      | "sendResponse"
      | "sendEvent"
      | "replaceSubscriptions"
      | "getLocalSocketsForUser"
      | "publishPermissionRebalance"
      | "reconnectUser"
      | "subscribe"
      | "unsubscribe"
    >,
    private readonly activity: Pick<ActivityPublisher, "publish">,
    private readonly mapPings: Pick<MapPingService, "send">,
    private readonly airTags: Pick<
      AirTagService,
      "updateSubscription" | "publishObservations"
    >,
  ) {
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

    if (socket.data.frameEncoding === "json") {
      if (Buffer.isBuffer(input)) {
        return Effect.sync(() =>
          socket.close(1003, "text JSON frames required"),
        );
      }

      try {
        decoded = JSON.parse(input);
      } catch {
        return Effect.sync(() =>
          socket.close(1007, "malformed realtime frame"),
        );
      }
    } else {
      if (!Buffer.isBuffer(input)) {
        return Effect.sync(() =>
          socket.close(1003, "binary MessagePack frames required"),
        );
      }

      try {
        decoded = decode(input);
      } catch {
        return Effect.sync(() =>
          socket.close(1007, "malformed realtime frame"),
        );
      }
    }

    let command: Command;

    try {
      command = decodeClientCommand(decoded);
    } catch {
      const rejection = invalidLegacyPayloadResponse(decoded);

      if (rejection) {
        return Effect.sync(() => {
          this.hub.sendResponse(socket, rejection);
        });
      }

      return Effect.sync(() => socket.close(1007, "malformed realtime frame"));
    }

    if (overloaded) {
      return Effect.sync(() => {
        if (command.requestId) {
          this.hub.sendResponse(
            socket,
            errorResponse(
              command.requestId,
              "COMMAND_REJECTED",
              "command temporarily unavailable",
              true,
            ),
          );
        } else {
          // Legacy fire-and-forget commands cannot receive a correlated error.
          socket.close(1013, "command capacity exceeded");
        }
      });
    }

    const dispatch = Effect.suspend(() => this.dispatch(socket, command)).pipe(
      Effect.tap((data) =>
        Effect.sync(() => {
          if (command.requestId)
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

    const traced =
      command.type === "session.join" || command.type === "presence.publish"
        ? dispatch.pipe(
            Effect.withSpan("gateway.command", {
              attributes: { "rpc.method": command.type },
            }),
          )
        : dispatch;

    return traced.pipe(
      Effect.catch((error) => {
        const failure = isCommandFailure(error)
          ? commandFailureDetails(error)
          : { message: "command temporarily unavailable", retryable: true };

        return Effect.sync(() => {
          if (command.requestId)
            this.hub.sendResponse(
              socket,
              errorResponse(
                command.requestId,
                "COMMAND_REJECTED",
                failure.message,
                failure.retryable,
              ),
            );
        });
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
          guilds: allowedGuilds,
          discordId,
        });

        const changes = diffAccessPolicies(previousPolicy, accessPolicy);
        socket.data.guilds = allowedGuilds;

        if (changes.length === 0) continue;
        const updatedIds = new Set(allowedGuilds.map(({ guild }) => guild.id));

        const removedIds = previousPolicy.organizations
          .map(({ organizationId }) => organizationId)
          .filter((id) => !updatedIds.has(id));

        socket.data.airTagScopes = socket.data.airTagScopes.filter((scope) =>
          canSubscribe(socket.data, scope.subscription),
        );
        const scopes = defaultScopes(socket.data);
        const scopeKeys = new Set(scopes.map(getScopeKey));

        for (const scope of socket.data.subscriptions.values()) {
          if (
            canSubscribe(socket.data, scope) &&
            !scopeKeys.has(getScopeKey(scope))
          ) {
            scopes.push(scope);
            scopeKeys.add(getScopeKey(scope));
          }
        }

        try {
          hub.replaceSubscriptions(socket, scopes);
        } catch (cause) {
          socket.data.subscriptions.clear();
          socket.data.airTagScopes = [];
          socket.close(1008, "subscription reconciliation failed");
          sideEffects.push(
            Effect.logWarning("Subscription reconciliation failed", cause),
          );
          continue;
        }

        const event = {
          v: 1,
          type: "permissions.updated",
          data: {
            accessPolicy,
            changes,
            organizationIds: organizationIds(socket.data),
            subscriptionScopes: scopes,
          },
        } satisfies Event;

        try {
          hub.sendEvent(socket, event);
        } catch (cause) {
          socket.close(1013, "permission update delivery failed");
          sideEffects.push(
            Effect.logWarning("Permission update delivery failed", cause),
          );
        }

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

  private dispatch(
    socket: GatewaySocket,
    command: Command,
  ): Effect.Effect<unknown, CommandFailure> {
    if (!hasValidApiKeyLease(socket.data))
      return Effect.fail(new OrganizationAccessDenied());

    if (
      socket.data.apiKeyAccess &&
      ![
        "session.join",
        "connection.ping",
        "presence.fetch",
        "subscription.subscribe",
        "subscription.unsubscribe",
      ].includes(command.type)
    )
      return Effect.fail(new OrganizationAccessDenied());

    const fromPromise = <A>(evaluate: () => Promise<A>) =>
      Effect.tryPromise({
        try: evaluate,
        catch: (cause) =>
          new RealtimeDependencyError({ operation: command.type, cause }),
      });

    const requireJoined = this.requireJoined(socket);

    switch (command.type) {
      case "session.join":
        return this.join(socket, command.data);
      case "presence.heartbeat":
        return requireJoined.pipe(
          Effect.andThen(
            this.presence.heartbeat(socket, command.data.sessionId),
          ),
          Effect.map((lastSeen) => ({ lastSeen })),
        );
      case "connection.ping":
        return Effect.void;
      case "presence.publish":
        return requireJoined.pipe(
          Effect.andThen(this.presence.publish(socket, command.data)),
        );
      case "presence.fetch": {
        const scope = {
          topic: "organization.presence",
          organizationId: command.data.organizationId,
        } satisfies Scope;

        if (!canSubscribe(socket.data, scope))
          return Effect.fail(new OrganizationAccessDenied());

        return requireJoined.pipe(
          Effect.andThen(
            this.presence.snapshot(
              socket.data,
              command.data.organizationId,
              command.data.world,
            ),
          ),
          Effect.tap((snapshot) =>
            Effect.sync(() => {
              if (command.requestId && command.data.delivery === "response")
                return;

              this.hub.sendEvent(socket, {
                v: 1,
                type: "presence.snapshot",
                sequence: snapshot.revision,
                data: snapshot,
              });
            }),
          ),
        );
      }

      case "subscription.subscribe":
        if (!canSubscribe(socket.data, command.data))
          return Effect.fail(new OrganizationAccessDenied());

        return requireJoined.pipe(
          Effect.andThen(
            Effect.try({
              try: () => {
                this.hub.subscribe(socket, command.data);

                return { scope: command.data };
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
        );
      case "subscription.unsubscribe":
        return requireJoined.pipe(
          Effect.andThen(
            Effect.sync(() => {
              this.hub.unsubscribe(socket, command.data);

              return { scope: command.data };
            }),
          ),
        );
      case "map-ping.send":
        return requireJoined.pipe(
          Effect.andThen(
            fromPromise(() => this.mapPings.send(socket, command.data)),
          ),
        );
      case "air-tag.subscription":
        return requireJoined.pipe(
          Effect.andThen(
            fromPromise(() =>
              this.airTags.updateSubscription(socket, command.data),
            ),
          ),
        );
      case "air-tag.observation":
        return requireJoined.pipe(
          Effect.andThen(
            fromPromise(() =>
              this.airTags.publishObservations(socket, command.data),
            ),
          ),
        );
    }
  }

  private join(
    socket: GatewaySocket,
    data: Extract<Command, { type: "session.join" }>["data"],
  ): Effect.Effect<unknown, CommandFailure> {
    const { activity, guilds, hub, presence, proofVerifier } = this;

    return Effect.gen(function* () {
      const wasJoined = socket.data.joined;

      if (socket.data.platform === "game" && !data.character)
        return yield* Effect.fail(new GameCharacterRequired());

      if (
        socket.data.apiKeyAccess &&
        (data.character || data.margonemAccountProof)
      )
        return yield* Effect.fail(new OrganizationAccessDenied());
      socket.data.character = data.character;
      socket.data.confidence = "reported";

      if (data.character) {
        const verification = yield* proofVerifier.verify({
          proof: data.margonemAccountProof,
          socketId: socket.data.connectionId,
          accountId: data.character.accountId,
          characterId: data.character.characterId,
          clanId: data.character.clan?.id,
        });

        if (verification.valid) socket.data.confidence = "verified";
      }

      const userGuilds = yield* guilds.getUserGuilds(socket.data);
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
        socket.data.presence = undefined;

        return yield* Effect.fail(new NoAuthorizedOrganizations());
      }

      socket.data.guilds = authorizedGuilds;
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
          capabilities: [REALTIME_PING_CAPABILITY],
        },
      } satisfies Event;

      hub.sendEvent(socket, event);

      if (!wasJoined && !socket.data.apiKeyAccess)
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
