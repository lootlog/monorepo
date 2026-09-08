import { createHash } from "node:crypto";
import {
  createAccessPolicySnapshot,
  diffAccessPolicies,
} from "@lootlog/protocol/realtime/access-policy";
import { decode } from "@msgpack/msgpack";
import {
  decodeClientCommand,
  type ClientCommand,
  type Response,
  type ServerEvent,
  type SubscriptionScope,
} from "@lootlog/protocol/realtime";
import { Effect, Function, Option, Schema } from "effect";
import type { GuildStore } from "#src/guilds/guild-store";
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
      this.rebalanceUser(discordId, userId),
    );
  }

  handle(socket: GatewaySocket, input: string | Buffer): Effect.Effect<void> {
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
        decoded = decode(new Uint8Array(input));
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
    return this.dispatch(socket, command).pipe(
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
      Effect.catch((error) =>
        Effect.sync(() => {
          const failure = isCommandFailure(error)
            ? commandFailureDetails(error)
            : { message: "command temporarily unavailable", retryable: true };
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
        }),
      ),
      Effect.asVoid,
    );
  }

  rebalanceUser(
    discordId: string,
    userId: string,
  ): Effect.Effect<void, unknown> {
    const { activity, guilds, hub, presence } = this;
    return Effect.gen(function* () {
      if (
        !hub
          .getLocalSocketsForUser(userId)
          .some((socket) => socket.data.discordId === discordId)
      )
        return;
      const updatedGuilds = yield* guilds.getUserGuilds({
        discordId,
        userId,
      });
      for (const socket of hub.getLocalSocketsForUser(userId)) {
        if (socket.data.discordId !== discordId) continue;
        const allowedGuilds = scopedGuilds(socket.data, updatedGuilds);
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
        if (removedIds.length > 0 && !socket.data.apiKeyAccess) {
          yield* activity.publish("DISCONNECT_EVENT", socket.data, removedIds);
        }
        if (!socket.data.apiKeyAccess) yield* presence.reconcileAccess(socket);
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
        hub.replaceSubscriptions(socket, scopes);
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
        hub.sendEvent(socket, event);
        if (allowedGuilds.length === 0) {
          if (socket.data.apiKeyAccess) socket.data.apiKeyLeaseExpiresAt = 0;
          socket.close(1008, "organization access removed");
        }
      }
    });
  }

  rebalanceAcrossInstances(
    discordId: string,
    userId: string,
  ): Effect.Effect<void, unknown> {
    return this.guilds
      .invalidate({ discordId, userId })
      .pipe(
        Effect.andThen(this.rebalanceUser(discordId, userId)),
        Effect.andThen(this.hub.publishPermissionRebalance(discordId, userId)),
      );
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
            Effect.sync(() =>
              this.hub.sendEvent(socket, {
                v: 1,
                type: "presence.snapshot",
                sequence: snapshot.revision,
                data: snapshot,
              }),
            ),
          ),
        );
      }
      case "subscription.subscribe":
        if (!canSubscribe(socket.data, command.data))
          return Effect.fail(new OrganizationAccessDenied());
        return requireJoined.pipe(
          Effect.andThen(
            Effect.sync(() => {
              this.hub.subscribe(socket, command.data);
              return { scope: command.data };
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
            Effect.sync(() =>
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
      hub.replaceSubscriptions(socket, scopes);
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
