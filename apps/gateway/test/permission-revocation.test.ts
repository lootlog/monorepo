import { expect, test } from "bun:test";
import { Effect, Schema } from "effect";
import { HttpClient, HttpClientResponse } from "effect/http";
import { RabbitRoutingKey } from "@lootlog/protocol/rabbit/topology";
import { decodeRealtimeFrame } from "@lootlog/protocol/realtime/codec";
import { Permission } from "@lootlog/schema/permissions";
import {
  InternalGuildsData,
  makeInternalGuildsData,
  getInternalUserPermissions,
  type InternalGuildsPersistence,
} from "../../api/src/http-api/handlers/internal/internal.handlers.js";
import { InternalUserPermissionsQuery } from "../../api/src/contracts/internal/schemas.js";
import { createPermissionCacheBoundary } from "../../api/test/permission-cache-fixtures.js";
import {
  createGuildFixture,
  createMemberFixture,
} from "../../api/test/organization-fixtures.js";
import { makeGuildStore } from "../src/guilds/guild-store.js";
import { ActivityPublisher } from "../src/rabbit/activity-publisher.js";
import { makeMargonemProofVerifier } from "../src/auth/margonem-proof.js";
import { PresenceStore } from "../src/realtime/presence-store.js";
import { MapPingService } from "../src/realtime/map-ping-service.js";
import { BattlePingService } from "../src/realtime/battle-ping-service.js";
import { LootSplitService } from "../src/realtime/loot-split-service.js";
import { NpcPresenceService } from "../src/realtime/npc-presence-service.js";
import { AirTagService } from "../src/realtime/air-tag-service.js";
import { RealtimeHub } from "../src/realtime/realtime-hub.js";
import { makeCommandHandler } from "./command-handler-fixtures.js";
import { makeGuildStoreRedis } from "./guild-store-fixtures.js";
import { makeRabbitBridgeHarness } from "./rabbit-fixtures.js";
import {
  benchmarkConfig as config,
  makeFederationBus,
  makeSession,
  makeTestSocket,
  withApiKey,
} from "./realtime-fixtures.js";

const identity = { discordId: "discord-member", userId: "user-member" };

const grantedPermissions = [
  Permission.LOOTLOG_ACCESS,
  Permission.LOOTLOG_CHAT_READ,
  Permission.LOOTLOG_TIMERS_READ,
  Permission.LOOTLOG_TIMERS_HEROES_READ,
  Permission.LOOTLOG_TIMERS_TITANS_READ,
];

type Npc = { readonly type: string; readonly lvl: number };

type Members = Effect.Success<
  ReturnType<InternalGuildsPersistence["findMembersWithRoles"]>
>;

const member = (guildId: string): Members[number] => ({
  ...createMemberFixture({
    guildId,
    userId: identity.discordId,
    globalUserId: identity.userId,
  }),
  roles: [
    {
      id: `role-${guildId}`,
      guildId,
      name: "Readers",
      color: null,
      position: 1,
      createdAt: new Date(0),
      updatedAt: new Date(0),
      lvlRangeFrom: 1,
      lvlRangeTo: 500,
      permissions: [...grantedPermissions],
    },
  ],
});

const setup = async () => {
  let members: Members = [member("organization-1"), member("organization-2")];
  const apiRedis = createPermissionCacheBoundary();

  const api = makeInternalGuildsData(
    {
      findActiveGuild: () => Effect.succeed(null),
      findGuildsForPermissions: () =>
        Effect.sync(() =>
          members
            .filter((entry) => entry.active)
            .map(({ guildId }) => createGuildFixture({ id: guildId })),
        ),
      findMembersWithRoles: () => Effect.sync(() => structuredClone(members)),
    },
    apiRedis.cache,
  );

  let permissionRequests = 0;

  const http = HttpClient.make((request) =>
    Effect.gen(function* () {
      permissionRequests++;

      const query = Schema.decodeUnknownSync(InternalUserPermissionsQuery)(
        Object.fromEntries(new URL(request.url).searchParams),
      );

      const permissions = yield* getInternalUserPermissions(
        query.discordId,
        query.userId,
        query.freshness,
      ).pipe(Effect.provideService(InternalGuildsData, api));

      return HttpClientResponse.fromWeb(request, Response.json(permissions));
    }).pipe(Effect.orDie),
  );

  const redis = makeGuildStoreRedis(identity);

  // The third replica holds none of the member's sockets.
  const stores = Array.from({ length: 3 }, () =>
    makeGuildStore(config, redis.store, http),
  );

  const bus = makeFederationBus();
  const background: Promise<void>[] = [];

  const unexpected = () => {
    throw new Error("Unexpected presence Redis I/O for a web socket");
  };

  const replicas = stores.map((store) => {
    const hub = new RealtimeHub(config, bus.store, (_label, effect) => {
      background.push(Effect.runPromise(effect));
    });

    const presenceRedis = {
      command: {
        get: unexpected,
        set: unexpected,
        del: unexpected,
        expire: unexpected,
        sadd: unexpected,
        srem: unexpected,
        smembers: unexpected,
        mget: unexpected,
        incr: unexpected,
        eval: unexpected,
      },
    };

    const presence = new PresenceStore(presenceRedis, hub);
    const npcPresence = new NpcPresenceService(presenceRedis, hub);
    const airTags = new AirTagService(presenceRedis, hub);

    const { handler: commands } = makeCommandHandler({
      guilds: store,
      verifier: makeMargonemProofVerifier(config, http),
      presence,
      hub,
      activity: new ActivityPublisher({ publish: () => Effect.void }, config),
      sessionFeatures: { npcPresence, airTags },
      features: {
        mapPings: new MapPingService(presenceRedis, hub),
        battlePings: new BattlePingService(presenceRedis, hub),
        lootSplits: new LootSplitService(presenceRedis, hub),
        airTags,
        npcPresence,
      },
    });

    return { store, hub, commands, presence };
  });

  for (const replica of replicas) await Effect.runPromise(replica.hub.start());
  const first = replicas[0];

  if (!first) throw new Error("Missing first replica");

  const rabbit = makeRabbitBridgeHarness(first.hub, {
    commands: first.commands,
    presence: first.presence,
  });

  await Effect.runPromise(Effect.scoped(rabbit.bridge.start()));

  const join = async (
    replica: typeof first,
    connectionId: string,
    organizationIds?: string[],
  ) => {
    const session = makeSession({ ...identity, connectionId, joined: false });

    const { socket, closes } = makeTestSocket(
      organizationIds
        ? withApiKey(session, organizationIds, { keyId: connectionId })
        : session,
    );

    const frames: ReturnType<typeof decodeRealtimeFrame>[] = [];

    socket.send = (frame: string) => {
      frames.push(decodeRealtimeFrame(frame));

      return 1;
    };

    replica.hub.register(socket);
    await Effect.runPromise(
      replica.commands.handle(
        socket,
        JSON.stringify({
          v: 1,
          type: "session.join",
          requestId: "join",
          data: {},
        }),
      ),
    );

    if (connectionId !== "reconnect" && !socket.data.joined)
      throw new Error(JSON.stringify(frames));
    frames.length = 0;

    return { socket, frames, closes };
  };

  const targets = [];

  for (const [index, replica] of replicas.slice(0, 2).entries()) {
    targets.push(await join(replica, `web-${index}`));
    targets.push(await join(replica, `key-1-${index}`, ["organization-1"]));
    targets.push(await join(replica, `key-2-${index}`, ["organization-2"]));
  }

  const deliverChange = async (
    routingKey:
      | typeof RabbitRoutingKey.GUILDS_MEMBERS_UPDATE
      | typeof RabbitRoutingKey.GUILDS_MEMBERS_REMOVE
      | typeof RabbitRoutingKey.GUILDS_MEMBERS_REMOVE_ROLE,
  ) => {
    await Effect.runPromise(
      rabbit.deliver(routingKey, { ...identity, guildId: "organization-1" }),
    );
    await Promise.all(background.splice(0));
  };

  const publish = async (
    organizationId: string,
    npc: Npc = { type: "HERO", lvl: 300 },
  ) => {
    await first.hub.publishToScope(
      { topic: "organization.chat", organizationId },
      { v: 1, type: "chat.cleared", data: { organizationId, payload: {} } },
    );
    await first.hub.publishToScope(
      { topic: "organization.timers", organizationId },
      {
        v: 1,
        type: "timer.created",
        data: {
          organizationId,
          payload: { npc },
        },
      },
    );
  };

  return {
    targets,
    replicas,
    api,
    apiRedis,
    join,
    first,
    publish,
    deliverChange,
    permissionRequests: () => permissionRequests,
    narrowLevels: () => {
      members = members.map((entry) =>
        entry.guildId !== "organization-1"
          ? entry
          : {
              ...entry,
              roles: entry.roles.map((role) => ({
                ...role,
                lvlRangeFrom: 100,
                lvlRangeTo: 200,
                permissions: role.permissions.filter(
                  (permission) =>
                    permission !== Permission.LOOTLOG_TIMERS_TITANS_READ,
                ),
              })),
            },
      );
    },
    revoke: (removed: boolean) => {
      members = members.map((entry) =>
        entry.guildId !== "organization-1"
          ? entry
          : {
              ...entry,
              active: !removed,
              roles: entry.roles.map((role) => ({
                ...role,
                permissions: [
                  Permission.LOOTLOG_ACCESS,
                  Permission.LOOTLOG_TIMERS_READ,
                ],
              })),
            },
      );
    },
  };
};

for (const change of ["role", "membership"] as const) {
  test(`a warm API projection cannot restore revoked ${change} access on either gateway replica`, async () => {
    const system = await setup();
    await system.publish("organization-1");
    await system.publish("organization-2");

    for (const target of system.targets) {
      expect(target.frames).toHaveLength(
        target.socket.data.apiKeyAccess ? 2 : 4,
      );
      target.frames.length = 0;
    }

    system.revoke(change === "membership");

    // A warm, successful response remains stale until API invalidation arrives.
    // Reconciliation must demand fresh data instead of committing those grants.
    const stale = await Effect.runPromise(
      system.api.getUserPermissions(identity.discordId, identity.userId),
    );

    expect(stale).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          guild: expect.objectContaining({ id: "organization-1" }),
          roles: expect.arrayContaining([
            expect.objectContaining({
              permissions: expect.arrayContaining([
                Permission.LOOTLOG_CHAT_READ,
              ]),
            }),
          ]),
        }),
      ]),
    );

    const requestsBefore = system.permissionRequests();

    await system.deliverChange(
      change === "membership"
        ? RabbitRoutingKey.GUILDS_MEMBERS_REMOVE
        : RabbitRoutingKey.GUILDS_MEMBERS_REMOVE_ROLE,
    );

    // One fresh read per replica holding the member's sockets; the idle one reads none.
    expect(system.permissionRequests() - requestsBefore).toBe(2);

    for (const target of system.targets) target.frames.length = 0;
    await system.publish("organization-1");
    await system.publish("organization-2");

    for (const target of system.targets) {
      const scopedToRevoked =
        target.socket.data.apiKeyAccess?.organizationIds.includes(
          "organization-1",
        );

      expect(target.frames).toHaveLength(scopedToRevoked ? 0 : 2);
      expect(
        target.frames.every(
          (frame) =>
            "type" in frame &&
            "organizationId" in frame.data &&
            frame.data.organizationId === "organization-2",
        ),
      ).toBe(true);
      expect(target.closes).toEqual(
        change === "membership" && scopedToRevoked ? [1008] : [],
      );

      if (change === "membership")
        expect(
          target.socket.data.guilds.some(
            ({ guild }) => guild.id === "organization-1",
          ),
        ).toBe(false);
    }

    // A subsequent join must use the revised gateway projection, not the warm API grant.
    const reconnect = await system.join(system.first, "reconnect", [
      "organization-1",
    ]);

    expect(reconnect.socket.data.joined).toBe(change !== "membership");
    await system.publish("organization-1");
    expect(reconnect.frames).toEqual([]);
  });
}

test("narrowing NPC levels and revoking a tier grant revokes those deliveries on both replicas without removing chat or in-range access", async () => {
  const system = await setup();
  const titan = { type: "TITAN", lvl: 150 };

  await system.publish("organization-1");
  await system.publish("organization-1", titan);

  for (const target of system.targets) {
    const canReadOrganization =
      !target.socket.data.apiKeyAccess ||
      target.socket.data.apiKeyAccess.organizationIds.includes(
        "organization-1",
      );

    expect(target.frames).toHaveLength(canReadOrganization ? 4 : 0);
    target.frames.length = 0;
  }

  system.narrowLevels();

  const stale = await Effect.runPromise(
    system.api.getUserPermissions(identity.discordId, identity.userId),
  );

  expect(stale).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        guild: expect.objectContaining({ id: "organization-1" }),
        roles: expect.arrayContaining([
          expect.objectContaining({ lvlRangeTo: 500 }),
        ]),
      }),
    ]),
  );
  await system.deliverChange(RabbitRoutingKey.GUILDS_MEMBERS_UPDATE);

  for (const target of system.targets) target.frames.length = 0;
  await system.publish("organization-1");
  await system.publish("organization-1", { type: "HERO", lvl: 150 });
  await system.publish("organization-1", titan);
  await system.publish("organization-2");
  await system.publish("organization-2", titan);

  for (const target of system.targets) {
    const organizationIds = target.socket.data.apiKeyAccess
      ?.organizationIds ?? ["organization-1", "organization-2"];

    const expected = [];

    if (organizationIds.includes("organization-1")) {
      expected.push(
        { type: "chat.cleared", data: { organizationId: "organization-1" } },
        { type: "chat.cleared", data: { organizationId: "organization-1" } },
        {
          type: "timer.created",
          data: {
            organizationId: "organization-1",
            payload: { npc: { type: "HERO", lvl: 150 } },
          },
        },
        { type: "chat.cleared", data: { organizationId: "organization-1" } },
      );
    }

    if (organizationIds.includes("organization-2")) {
      expected.push(
        { type: "chat.cleared", data: { organizationId: "organization-2" } },
        {
          type: "timer.created",
          data: {
            organizationId: "organization-2",
            payload: { npc: { type: "HERO", lvl: 300 } },
          },
        },
        { type: "chat.cleared", data: { organizationId: "organization-2" } },
        {
          type: "timer.created",
          data: { organizationId: "organization-2", payload: { npc: titan } },
        },
      );
    }

    expect(target.frames).toMatchObject(expected);
    expect(target.closes).toEqual([]);
  }
});
