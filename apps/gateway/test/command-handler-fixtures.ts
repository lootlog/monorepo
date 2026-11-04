import { Permission } from "@lootlog/schema/permissions";
import { Effect } from "effect";
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

/** Admits every command, so a test exercises the command, not its rejection. */
export const admitAll: Pick<CommandAdmission, "tryAcquire"> = {
  tryAcquire: () => ({ admitted: true, release: () => {} }),
};

/** Feature services that die when a command reaches them. */
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

/** The Lootlog `organization-1` membership of a command test. */
export const guild = (
  permissions: Permission[] = [Permission.LOOTLOG_ONLINE_PLAYERS_READ],
  organizationId = "organization-1",
): UserGuildData => membership(organizationId, permissions);

export class FakeGuildStore {
  guilds: UserGuildData[] = [guild()];

  getUserGuilds: GuildStore["getUserGuilds"] = () =>
    Effect.succeed(this.guilds);

  invalidate: GuildStore["invalidate"] = () => Effect.void;
}

/** Records what the handler sends; local sockets are those a test pushes. */
export class FakeHub {
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

  publishPermissionRebalance(): Effect.Effect<void, unknown> {
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

export class FakeActivity {
  readonly calls: Array<{ type: string; ids?: ReadonlyArray<string> }> = [];

  publish: ActivityPublisher["publish"] = (type, _session, ids) =>
    Effect.sync(() => {
      this.calls.push({ type, ids });
    });
}

/** Presence I/O dies unless a test replaces it; reconciliation only records. */
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

/**
 * A CommandHandler over recording fakes. Each dependency a test passes
 * replaces its fake; the returned fakes are the ones the handler uses otherwise.
 */
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

  /** Sends one command frame and waits until the handler settles it. */
  const send = (
    socket: GatewaySocket,
    command: Parameters<typeof commandFrame>[0],
    requestId?: string,
  ) =>
    Effect.runPromise(handler.handle(socket, commandFrame(command, requestId)));

  return { handler, send, ...fakes };
};
