import { decode } from "@msgpack/msgpack";
import {
  decodeClientCommand,
  type ClientCommand,
  type Response,
  type ServerEvent,
  type SubscriptionScope,
} from "@lootlog/protocol/realtime";
import { Effect } from "effect";
import type { GatewayConfiguration } from "#src/config/gateway-config";
import type { GuildStore } from "#src/guilds/guild-store";
import type { MargonemProofVerifier } from "#src/auth/margonem-proof";
import type { ActivityPublisher } from "#src/rabbit/activity-publisher";
import type { AirTagService } from "#src/realtime/air-tag-service";
import type { MapPingService } from "#src/realtime/map-ping-service";
import type { PresenceStore } from "#src/realtime/presence-store";
import type { RealtimeHub } from "#src/realtime/realtime-hub";
import type { GatewaySocket } from "#src/realtime/session";
import {
  canSubscribe,
  defaultScopes,
  organizationIds,
} from "#src/realtime/subscription-policy";

type Command = typeof ClientCommand.Type;
type Scope = typeof SubscriptionScope.Type;
type Event = typeof ServerEvent.Type;
type RealtimeResponse = typeof Response.Type;

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

const invalidLegacyPayloadResponse = (
  input: unknown,
): RealtimeResponse | null => {
  if (!input || typeof input !== "object") return null;
  if (!("v" in input) || input.v !== 1) return null;
  if (
    !("requestId" in input) ||
    typeof input.requestId !== "string" ||
    input.requestId.length === 0
  )
    return null;
  if (!("type" in input) || typeof input.type !== "string") return null;
  if (input.type === "map-ping.send") {
    return {
      v: 1,
      requestId: input.requestId,
      status: "success",
      data: { status: "rejected", code: "invalid-payload" },
    };
  }
  if (input.type === "air-tag.observation") {
    return {
      v: 1,
      requestId: input.requestId,
      status: "success",
      data: { status: "rejected", code: "invalid-payload" },
    };
  }
  return null;
};

export class CommandHandler {
  constructor(
    private readonly config: GatewayConfiguration,
    private readonly guilds: GuildStore,
    private readonly proofVerifier: MargonemProofVerifier,
    private readonly presence: PresenceStore,
    private readonly hub: RealtimeHub,
    private readonly activity: ActivityPublisher,
    private readonly mapPings: MapPingService,
    private readonly airTags: AirTagService,
  ) {
    this.hub.onPermissionRebalance((discordId, userId) =>
      this.rebalanceUser(discordId, userId),
    );
  }

  handle(socket: GatewaySocket, input: string | Buffer): Effect.Effect<void> {
    if (typeof input === "string") {
      return Effect.sync(() =>
        socket.close(1003, "binary MessagePack frames required"),
      );
    }
    let decoded: unknown;
    try {
      decoded = decode(new Uint8Array(input));
    } catch {
      return Effect.sync(() => socket.close(1007, "malformed realtime frame"));
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
          if (command.requestId)
            this.hub.sendResponse(
              socket,
              errorResponse(
                command.requestId,
                "COMMAND_REJECTED",
                error instanceof Error ? error.message : "command rejected",
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
    const { activity, airTags, guilds, hub } = this;
    return Effect.gen(function* () {
      yield* guilds.invalidate({ discordId, userId });
      const updatedGuilds = yield* guilds.getUserGuilds({
        discordId,
        userId,
      });
      for (const socket of hub.getLocalSocketsForUser(userId)) {
        if (socket.data.discordId !== discordId) continue;
        const updatedIds = new Set(updatedGuilds.map(({ guild }) => guild.id));
        const removedIds = socket.data.guilds
          .map(({ guild }) => guild.id)
          .filter((id) => !updatedIds.has(id));
        if (removedIds.length > 0) {
          yield* activity.publish("DISCONNECT_EVENT", socket.data, removedIds);
        }
        socket.data.guilds = updatedGuilds;
        airTags.clearSubscription(socket);
        const scopes = defaultScopes(socket.data);
        hub.replaceSubscriptions(socket, scopes);
        const event = {
          v: 1,
          type: "permissions.updated",
          data: {
            organizationIds: organizationIds(socket.data),
            subscriptionScopes: scopes,
          },
        } satisfies Event;
        hub.sendEvent(socket, event);
        if (updatedGuilds.length === 0)
          socket.close(1008, "organization access removed");
      }
    });
  }

  rebalanceAcrossInstances(
    discordId: string,
    userId: string,
  ): Effect.Effect<void, unknown> {
    return this.rebalanceUser(discordId, userId).pipe(
      Effect.andThen(this.hub.publishPermissionRebalance(discordId, userId)),
    );
  }

  private dispatch(
    socket: GatewaySocket,
    command: Command,
  ): Effect.Effect<unknown, unknown> {
    const fromPromise = <A>(evaluate: () => Promise<A>) =>
      Effect.tryPromise({ try: evaluate, catch: (cause) => cause });
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
          return Effect.fail(new Error("presence access denied"));
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
          return Effect.fail(new Error("subscription access denied"));
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
  ): Effect.Effect<unknown, unknown> {
    const { activity, config, guilds, hub, proofVerifier } = this;
    return Effect.gen(function* () {
      const wasJoined = socket.data.joined;
      if (socket.data.platform === "game" && !data.character)
        return yield* Effect.fail(
          new Error("game sessions require a character"),
        );
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
        if (!verification.valid && config.margonemAccountProofRequired) {
          return yield* Effect.fail(
            new Error("Margonem account proof is required"),
          );
        }
      }
      const authorizedGuilds = yield* guilds.getUserGuilds(socket.data);
      if (authorizedGuilds.length === 0)
        return yield* Effect.fail(new Error("no authorized organizations"));
      socket.data.guilds = authorizedGuilds;
      socket.data.joined = true;
      const scopes = defaultScopes(socket.data);
      hub.replaceSubscriptions(socket, scopes);
      const event = {
        v: 1,
        type: "session.joined",
        data: {
          connectionId: socket.data.connectionId,
          organizationIds: organizationIds(socket.data),
          subscriptionScopes: scopes,
        },
      } satisfies Event;
      hub.sendEvent(socket, event);
      if (!wasJoined) yield* activity.publish("CONNECT_EVENT", socket.data);
      return event.data;
    });
  }

  private requireJoined(socket: GatewaySocket): Effect.Effect<void, Error> {
    return socket.data.joined
      ? Effect.void
      : Effect.fail(new Error("session.join is required"));
  }
}
