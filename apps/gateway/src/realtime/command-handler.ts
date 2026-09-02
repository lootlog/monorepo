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

  async handle(socket: GatewaySocket, input: string | Buffer): Promise<void> {
    if (typeof input === "string") {
      socket.close(1003, "binary MessagePack frames required");
      return;
    }
    let decoded: unknown;
    try {
      decoded = decode(new Uint8Array(input));
    } catch {
      socket.close(1007, "malformed realtime frame");
      return;
    }
    let command: Command;
    try {
      command = decodeClientCommand(decoded);
    } catch {
      const rejection = invalidLegacyPayloadResponse(decoded);
      if (rejection) {
        this.hub.sendResponse(socket, rejection);
        return;
      }
      socket.close(1007, "malformed realtime frame");
      return;
    }

    try {
      const data = await this.dispatch(socket, command);
      if (command.requestId) {
        this.hub.sendResponse(socket, {
          v: 1,
          requestId: command.requestId,
          status: "success",
          data,
        });
      }
    } catch (error) {
      if (command.requestId) {
        this.hub.sendResponse(
          socket,
          errorResponse(
            command.requestId,
            "COMMAND_REJECTED",
            error instanceof Error ? error.message : "command rejected",
          ),
        );
      }
    }
  }

  async rebalanceUser(discordId: string, userId: string): Promise<void> {
    await Effect.runPromise(this.guilds.invalidate({ discordId, userId }));
    const updatedGuilds = await Effect.runPromise(
      this.guilds.getUserGuilds({ discordId, userId }),
    );
    for (const socket of this.hub.getLocalSocketsForUser(userId)) {
      if (socket.data.discordId !== discordId) continue;
      const updatedIds = new Set(updatedGuilds.map(({ guild }) => guild.id));
      const removedIds = socket.data.guilds
        .map(({ guild }) => guild.id)
        .filter((id) => !updatedIds.has(id));
      if (removedIds.length > 0) {
        await this.activity.publish(
          "DISCONNECT_EVENT",
          socket.data,
          removedIds,
        );
      }
      socket.data.guilds = updatedGuilds;
      this.airTags.clearSubscription(socket);
      const scopes = defaultScopes(socket.data);
      this.hub.replaceSubscriptions(socket, scopes);
      const event = {
        v: 1,
        type: "permissions.updated",
        data: {
          organizationIds: organizationIds(socket.data),
          subscriptionScopes: scopes,
        },
      } satisfies Event;
      this.hub.sendEvent(socket, event);
      if (updatedGuilds.length === 0)
        socket.close(1008, "organization access removed");
    }
  }

  async rebalanceAcrossInstances(
    discordId: string,
    userId: string,
  ): Promise<void> {
    await this.rebalanceUser(discordId, userId);
    await this.hub.publishPermissionRebalance(discordId, userId);
  }

  private async dispatch(
    socket: GatewaySocket,
    command: Command,
  ): Promise<unknown> {
    switch (command.type) {
      case "session.join":
        return this.join(socket, command.data);
      case "presence.heartbeat":
        this.requireJoined(socket);
        return {
          lastSeen: await this.presence.heartbeat(
            socket,
            command.data.sessionId,
          ),
        };
      case "presence.publish":
        this.requireJoined(socket);
        return this.presence.publish(socket, command.data);
      case "presence.fetch": {
        this.requireJoined(socket);
        const scope = {
          topic: "organization.presence",
          organizationId: command.data.organizationId,
        } satisfies Scope;
        if (!canSubscribe(socket.data, scope))
          throw new Error("presence access denied");
        const snapshot = await this.presence.snapshot(
          socket.data,
          command.data.organizationId,
          command.data.world,
        );
        this.hub.sendEvent(socket, {
          v: 1,
          type: "presence.snapshot",
          sequence: snapshot.revision,
          data: snapshot,
        });
        return snapshot;
      }
      case "subscription.subscribe":
        this.requireJoined(socket);
        if (!canSubscribe(socket.data, command.data))
          throw new Error("subscription access denied");
        this.hub.subscribe(socket, command.data);
        return { scope: command.data };
      case "subscription.unsubscribe":
        this.requireJoined(socket);
        this.hub.unsubscribe(socket, command.data);
        return { scope: command.data };
      case "map-ping.send":
        this.requireJoined(socket);
        return this.mapPings.send(socket, command.data);
      case "air-tag.subscription":
        this.requireJoined(socket);
        return this.airTags.updateSubscription(socket, command.data);
      case "air-tag.observation":
        this.requireJoined(socket);
        return this.airTags.publishObservations(socket, command.data);
    }
  }

  private async join(
    socket: GatewaySocket,
    data: Extract<Command, { type: "session.join" }>["data"],
  ): Promise<unknown> {
    const wasJoined = socket.data.joined;
    if (socket.data.platform === "game" && !data.character) {
      throw new Error("game sessions require a character");
    }
    socket.data.character = data.character;
    socket.data.confidence = "reported";
    if (data.character) {
      const verification = await Effect.runPromise(
        this.proofVerifier.verify({
          proof: data.margonemAccountProof,
          socketId: socket.data.connectionId,
          accountId: data.character.accountId,
          characterId: data.character.characterId,
          clanId: data.character.clan?.id,
        }),
      );
      if (verification.valid) socket.data.confidence = "verified";
      if (!verification.valid && this.config.margonemAccountProofRequired) {
        throw new Error("Margonem account proof is required");
      }
    }
    const guilds = await Effect.runPromise(
      this.guilds.getUserGuilds(socket.data),
    );
    if (guilds.length === 0) throw new Error("no authorized organizations");
    socket.data.guilds = guilds;
    socket.data.joined = true;
    const scopes = defaultScopes(socket.data);
    this.hub.replaceSubscriptions(socket, scopes);
    const event = {
      v: 1,
      type: "session.joined",
      data: {
        connectionId: socket.data.connectionId,
        organizationIds: organizationIds(socket.data),
        subscriptionScopes: scopes,
      },
    } satisfies Event;
    this.hub.sendEvent(socket, event);
    if (!wasJoined) await this.activity.publish("CONNECT_EVENT", socket.data);
    return event.data;
  }

  private requireJoined(socket: GatewaySocket): void {
    if (!socket.data.joined) throw new Error("session.join is required");
  }
}
