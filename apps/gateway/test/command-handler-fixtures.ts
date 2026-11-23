import { Capability } from "@lootlog/schema/permissions";
import { Effect, Tracer } from "effect";
import type { MargonemProofVerifier } from "../src/auth/margonem-proof.js";
import type { UserGuildData } from "../src/guilds/guild.js";
import type { GuildStore } from "../src/guilds/guild-store.js";
import type { ActivityPublisher } from "../src/rabbit/activity-publisher.js";
import type { CommandAdmission } from "../src/realtime/command-admission.js";
import {
  CommandHandler,
  gatewayFeatureRoutes,
} from "../src/realtime/command-handler.js";
import type { PresenceStore } from "../src/realtime/presence-store.js";
import type { GlobalChatCounts } from "../src/realtime/gateway-metrics.js";
import type { RealtimeHub } from "../src/realtime/realtime-hub.js";
import type { GatewaySocket, SessionData } from "../src/realtime/session.js";
import { commandFrame, membership } from "./realtime-fixtures.js";

type HandlerHub = ConstructorParameters<typeof CommandHandler>[4];

type FeatureServices = Parameters<typeof gatewayFeatureRoutes>[0];

type SessionFeatures = ConstructorParameters<typeof CommandHandler>[6];

const admitAll: Pick<CommandAdmission, "tryAcquire"> = {
  tryAcquire: () => ({ admitted: true, release: () => {} }),
};

export const unexpectedFeatures = {
  mapPings: { send: () => Effect.die("Unexpected map ping") },
  battlePings: { send: () => Effect.die("Unexpected battle ping") },
  lootSplits: {
    send: () => Effect.die("Unexpected loot split"),
    autoAccept: () => Effect.die("Unexpected loot split auto-accept"),
  },
  airTags: {
    updateSubscription: () => Effect.die("Unexpected air tag subscription"),
    publishObservations: () => Effect.die("Unexpected air tag observation"),
    fetchMapThreats: () => Effect.die("Unexpected map threat fetch"),
  },
  airTagObservationAdmission: admitAll,
  npcPresence: {
    report: () => Effect.die("Unexpected NPC presence report"),
    fetch: () => Effect.die("Unexpected NPC presence fetch"),
  },
} satisfies FeatureServices;

const quietSessionFeatures = {
  npcPresence: { refresh: () => Effect.void, withdraw: () => Effect.void },
  airTags: {
    registerInterest: () => Effect.die("Unexpected air tag interest"),
  },
} satisfies SessionFeatures;

export const guild = (
  permissions: Capability[] = [Capability.LOOTLOG_ONLINE_PLAYERS_READ],
  organizationId = "organization-1",
): UserGuildData => membership(organizationId, permissions);

class FakeGuildStore {
  guilds: UserGuildData[] = [guild()];

  getUserGuilds: GuildStore["getUserGuilds"] = () =>
    Effect.succeed(this.guilds);

  invalidate: GuildStore["invalidate"] = () => Effect.void;
}

class FakeHub {
  readonly deliveryOrder: string[] = [];
  readonly responses: unknown[] = [];
  readonly events: unknown[] = [];
  readonly sockets: GatewaySocket[] = [];
  globalChatCounts?: GlobalChatCounts;

  onPermissionRebalance(): void {}

  subscribe(): void {
    throw new Error("Unexpected subscribe");
  }

  unsubscribe(): void {
    throw new Error("Unexpected unsubscribe");
  }

  setPresence(socket: GatewaySocket, presence: SessionData["presence"]): void {
    socket.data.presence = presence;
  }

  publishPermissionRebalance(): Effect.Effect<void> {
    return Effect.void;
  }

  sendResponse(
    _socket: GatewaySocket,
    response: Parameters<RealtimeHub["sendResponse"]>[1],
  ): boolean {
    this.deliveryOrder.push("response");
    this.responses.push(response);

    return true;
  }

  sendEvent(
    _socket: GatewaySocket,
    event: Parameters<RealtimeHub["sendEvent"]>[1],
  ): boolean {
    this.deliveryOrder.push("event");
    this.events.push(event);

    return true;
  }

  replaceSubscriptions(
    socket: GatewaySocket,
    scopes: Parameters<RealtimeHub["replaceSubscriptions"]>[1],
  ): void {
    socket.data.subscriptions = new Map(
      scopes.map((scope, index) => [String(index), scope]),
    );
  }

  getLocalSocketsForUser(userId: string): GatewaySocket[] {
    return this.sockets.filter((socket) => socket.data.userId === userId);
  }

  reconnectUser(discordId: string, userId: string): void {
    for (const socket of this.getLocalSocketsForUser(userId)) {
      if (socket.data.discordId !== discordId) continue;
      this.sockets.splice(this.sockets.indexOf(socket), 1);
      socket.close(1013, "authorization temporarily unavailable");
    }
  }
}

class FakeActivity {
  readonly calls: Array<{ type: string; ids?: ReadonlyArray<string> }> = [];

  publish: ActivityPublisher["publish"] = (type, _session, ids) =>
    Effect.sync(() => {
      this.calls.push({ type, ids });
    });
}

export class FakePresence {
  readonly reconciled: GatewaySocket[] = [];

  heartbeat: PresenceStore["heartbeat"] = () =>
    Effect.die("Unexpected heartbeat");

  publish: PresenceStore["publish"] = () =>
    Effect.die("Unexpected presence publish");

  snapshot: PresenceStore["snapshot"] = () => Effect.die("Unexpected snapshot");

  reconcileAccess: PresenceStore["reconcileAccess"] = (socket) =>
    Effect.sync(() => {
      this.reconciled.push(socket);
    });
}

export const makeCommandHandler = ({
  guilds,
  verifier = {
    verify: () => Effect.succeed({ valid: false, reason: "not supplied" }),
  },
  publishAccountVerified = () => Effect.void,
  presence,
  hub,
  activity,
  sessionFeatures = {},
  features = {},
  joinAdmission = admitAll,
}: {
  readonly guilds?: GuildStore;
  readonly verifier?: MargonemProofVerifier;
  readonly publishAccountVerified?: ConstructorParameters<
    typeof CommandHandler
  >[2];
  readonly presence?: ConstructorParameters<typeof CommandHandler>[3];
  readonly hub?: HandlerHub;
  readonly activity?: Pick<ActivityPublisher, "publish">;
  readonly sessionFeatures?: Partial<SessionFeatures>;
  readonly features?: Partial<FeatureServices>;
  readonly joinAdmission?: Pick<CommandAdmission, "tryAcquire">;
} = {}) => {
  const fakes = {
    guilds: new FakeGuildStore(),
    hub: new FakeHub(),
    activity: new FakeActivity(),
    presence: new FakePresence(),
  };

  const handler = new CommandHandler(
    guilds ?? fakes.guilds,
    verifier,
    publishAccountVerified,
    presence ?? fakes.presence,
    hub ?? fakes.hub,
    activity ?? fakes.activity,
    { ...quietSessionFeatures, ...sessionFeatures },
    gatewayFeatureRoutes({ ...unexpectedFeatures, ...features }),
    joinAdmission,
  );

  const send = (
    socket: GatewaySocket,
    command: Parameters<typeof commandFrame>[0],
    requestId?: string,
  ) =>
    Effect.runPromise(handler.handle(socket, commandFrame(command, requestId)));

  return { handler, send, ...fakes };
};

export const onlinePresence = (
  organizationIds: ReadonlyArray<string>,
  platform: SessionData["platform"] = "web-app",
): NonNullable<SessionData["presence"]> => ({
  userId: "user-1",
  sessionId: "connection-1",
  organizationIds: [...organizationIds],
  platform,
  status: "online",
  confidence: "reported",
  isAfk: false,
  lastSeen: 1,
});

export const join = commandFrame({ type: "session.join", data: {} }, "join");

export const captureSpans = () => {
  const spans: Tracer.Span[] = [];

  const tracer = Tracer.make({
    span: (options) => {
      const span = new Tracer.NativeSpan(options);
      spans.push(span);

      return span;
    },
  });

  return { spans, tracer };
};
