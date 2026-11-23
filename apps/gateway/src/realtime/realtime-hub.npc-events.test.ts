import { makeRabbitBridgeHarness } from "../../test/rabbit-fixtures.js";
import {
  makeTestSocket,
  membership,
  startHubs,
  withApiKey,
  startPair,
  makeAdminSession,
} from "../../test/realtime-fixtures.js";
import { Permission } from "@lootlog/schema/permissions";
import type {
  PartyGatheringSummary,
  PartyGatheringUpdateEnvelope,
  PartyGatheringVolunteer,
} from "@lootlog/schema/party-ready-room";
import { expect, test } from "bun:test";
import { decodeRealtimeFrame } from "@lootlog/protocol/realtime/codec";
import { RabbitRoutingKey } from "@lootlog/protocol/rabbit/topology";
import { UnprocessableDelivery } from "@lootlog/messaging";
import { Cause, Effect, Exit, Option, Schema } from "effect";
import { canSubscribe } from "./subscription-policy.js";

test("gathering rosters reach authorized observers across gateways without exposing hidden sources or legacy clients", async () => {
  const [local, remote] = await startPair();
  const sourceGuild = "organization-1";
  const sharedGuild = "organization-2";

  const readPermissions = [
    Permission.LOOTLOG_CHAT_READ,
    Permission.LOOTLOG_CHAT_HEROES_READ,
  ];

  const scenarios: Array<{
    name: string;
    allowed: boolean;
    permissions?: Permission[];
    minimumLevel?: number;
    organizations?: string[];
    organizer?: boolean;
    owner?: boolean;
    apiKey?: boolean;
    world?: string;
  }> = [
    { name: "observer", allowed: true },
    {
      name: "shared-observer",
      allowed: true,
      organizations: [sourceGuild, sharedGuild],
    },
    {
      name: "organizer",
      allowed: true,
      organizer: true,
      permissions: [
        Permission.LOOTLOG_CHAT_READ,
        Permission.LOOTLOG_NOTIFICATIONS_SEND,
      ],
    },
    {
      name: "sender-only-organizer",
      allowed: true,
      organizer: true,
      permissions: [Permission.LOOTLOG_NOTIFICATIONS_SEND],
    },
    {
      name: "revoked-organizer",
      allowed: false,
      organizer: true,
      permissions: [],
    },
    {
      name: "api-key-organizer",
      allowed: false,
      organizer: true,
      apiKey: true,
      permissions: [Permission.LOOTLOG_NOTIFICATIONS_SEND],
    },
    { name: "owner", allowed: true, owner: true, permissions: [] },
    { name: "administrator", allowed: true, permissions: [Permission.ADMIN] },
    {
      name: "hidden-tier",
      allowed: false,
      permissions: [Permission.LOOTLOG_CHAT_READ],
    },
    { name: "hidden-level", allowed: false, minimumLevel: 200 },
    {
      name: "other-organization",
      allowed: false,
      organizations: [sharedGuild],
    },
    { name: "other-world-subscription", allowed: false, world: "classic" },
    { name: "api-key", allowed: false, apiKey: true },
  ];

  const targets = [local, remote].flatMap((hub, index) =>
    scenarios.map((scenario) => {
      const connectionId = `${index}-${scenario.name}`;

      const discordId = scenario.organizer
        ? "organizer"
        : `discord-${connectionId}`;

      const organizations = scenario.organizations ?? [sourceGuild];

      const session = makeAdminSession(connectionId, {
        platform: "game",
        discordId,
        guilds: organizations.map((id) =>
          membership(id, scenario.permissions ?? readPermissions, {
            ownerId: scenario.owner ? discordId : "different-owner",
            roleId: "reader",
            lvlRangeFrom: scenario.minimumLevel ?? 0,
          }),
        ),
      });

      if (scenario.apiKey)
        withApiKey(session, organizations, {
          keyId: "key",
          personalData: true,
        });

      const target = makeTestSocket(session);
      hub.register(target.socket);

      for (const organizationId of organizations) {
        const scope = {
          topic: "organization.chat",
          organizationId,
          world: scenario.world,
        } as const;

        if (canSubscribe(session, scope)) hub.subscribe(target.socket, scope);
      }

      return { ...target, scenario };
    }),
  );

  const harness = makeRabbitBridgeHarness(local);

  const volunteer: PartyGatheringVolunteer = {
    characterId: "volunteer",
    nick: "Chętny",
    icon: "player.gif",
    lvl: 110,
    prof: "w",
    partyPresence: "OUTSIDE",
  };

  const partyMember = {
    characterId: "member",
    nick: "W grupie",
    icon: "member.gif",
    lvl: 115,
    prof: "m",
  };

  const privateVolunteer = {
    ...volunteer,
    discordId: "private-volunteer",
    accountId: "private-account",
  };

  const gathering = {
    notificationId: "gathering",
    organizerName: "Organizator",
    organizerDiscordId: "organizer",
    world: "tempest",
    revision: 1,
    guildIds: [sourceGuild, sharedGuild],
    npc: { name: "Hero", location: "Map", lvl: 105, type: "HERO" },
    createdAt: "2026-09-28T10:00:00Z",
    expiresAt: "2026-09-28T11:00:00Z",
    applicantCount: 1,
    inPartyCount: 0,
    partyMemberCount: 1,
    volunteers: [privateVolunteer],
    partyState: {
      status: "OBSERVED",
      observedAt: "2026-09-28T10:01:00Z",
      members: [partyMember],
    },
  } satisfies PartyGatheringSummary;

  const envelope: PartyGatheringUpdateEnvelope = {
    guildId: sourceGuild,
    guildIds: gathering.guildIds,
    world: gathering.world,
    notificationId: gathering.notificationId,
    revision: gathering.revision,
    organizerDiscordId: gathering.organizerDiscordId,
    npc: gathering.npc,
    update: { type: "UPSERT", gathering },
  };

  await Effect.runPromise(
    Effect.scoped(
      Effect.gen(function* () {
        yield* harness.bridge.start();

        const deliver = (
          payload: PartyGatheringUpdateEnvelope,
          messageId: string,
        ) =>
          harness.deliver(
            RabbitRoutingKey.GUILDS_PARTY_GATHERING_UPDATED,
            payload,
            { messageId },
          );

        yield* deliver(envelope, "gathering-created");
        yield* deliver(envelope, "gathering-created");

        for (const target of targets) {
          expect(target.sent).toHaveLength(target.scenario.allowed ? 1 : 0);

          if (!target.scenario.allowed) continue;
          expect(target.sent.map(decodeRealtimeFrame)).toMatchObject([
            {
              type: "party-gathering.state-updated",
              data: {
                organizationId: sourceGuild,
                payload: {
                  type: "UPSERT",
                  gathering: {
                    organizerDiscordId: "organizer",
                    guildIds: [sourceGuild],
                    volunteers: [volunteer],
                    partyState: { members: [partyMember] },
                  },
                },
              },
            },
          ]);
          expect(
            JSON.stringify(target.sent.map(decodeRealtimeFrame)),
          ).not.toContain("private-");
        }

        yield* deliver(
          { ...envelope, guildId: sharedGuild },
          "gathering-created",
        );

        const sharedTargets = targets.filter(
          (target) => target.scenario.name === "shared-observer",
        );

        for (const target of sharedTargets) {
          expect(target.sent).toHaveLength(2);
          expect(decodeRealtimeFrame(target.sent[1] ?? "")).toMatchObject({
            data: {
              organizationId: sharedGuild,
              payload: { gathering: { guildIds: [sharedGuild] } },
            },
          });
        }

        const departure: PartyGatheringSummary = {
          ...gathering,
          revision: 2,
          partyMemberCount: 0,
          volunteers: [],
          applicantCount: 0,
          partyState: {
            status: "OBSERVED",
            observedAt: "2026-09-28T10:02:00Z",
            members: [],
          },
        };

        yield* deliver(
          {
            ...envelope,
            revision: 2,
            update: { type: "UPSERT", gathering: departure },
          },
          "gathering-departure",
        );
        yield* deliver(
          {
            ...envelope,
            revision: 3,
            update: {
              type: "REMOVE",
              notificationId: "gathering",
              revision: 3,
            },
          },
          "gathering-removed",
        );

        for (const target of targets.filter(
          (target) => target.scenario.allowed,
        )) {
          const frames = target.sent.map(decodeRealtimeFrame);
          expect(frames.slice(-2)).toMatchObject([
            {
              data: {
                payload: {
                  type: "UPSERT",
                  gathering: {
                    revision: 2,
                    applicantCount: 0,
                    volunteers: [],
                    partyMemberCount: 0,
                    partyState: { members: [] },
                  },
                },
              },
            },
            {
              data: {
                payload: {
                  type: "REMOVE",
                  notificationId: "gathering",
                  revision: 3,
                },
              },
            },
          ]);
        }

        for (const target of targets.filter(
          (target) =>
            !target.scenario.allowed &&
            target.scenario.name !== "other-organization",
        ))
          expect(target.sent).toHaveLength(0);

        const mismatched = yield* Effect.exit(
          deliver(
            { ...envelope, guildIds: [sharedGuild] },
            "mismatched-source",
          ),
        );

        const unprocessable = (exit: Exit.Exit<void, unknown>) =>
          Exit.isFailure(exit) &&
          Option.exists(
            Cause.findErrorOption(exit.cause),
            Schema.is(UnprocessableDelivery),
          );

        expect(unprocessable(mismatched)).toBe(true);

        for (const npc of [undefined, { ...gathering.npc, type: "COMMON" }]) {
          const invalidSource = yield* Effect.exit(
            deliver({ ...envelope, npc }, "hidden-source"),
          );

          expect(unprocessable(invalidSource)).toBe(true);
        }

        for (const target of targets.filter(
          (target) => target.scenario.name === "hidden-tier",
        ))
          expect(target.sent).toHaveLength(0);

        const { npc: _gatheringNpc, ...messageGathering } = gathering;
        const { npc: _envelopeNpc, ...messageEnvelope } = envelope;

        yield* deliver(
          {
            ...messageEnvelope,
            notificationId: "message-gathering",
            update: {
              type: "UPSERT",
              gathering: {
                ...messageGathering,
                notificationId: "message-gathering",
              },
            },
          },
          "message-gathering-created",
        );

        const observers = targets.filter(
          (target) => target.scenario.name === "observer",
        );

        expect(observers).toHaveLength(2);

        for (const observer of observers)
          expect(observer.sent.map(decodeRealtimeFrame).at(-1)).toMatchObject({
            data: {
              payload: {
                type: "UPSERT",
                gathering: { notificationId: "message-gathering" },
              },
            },
          });
      }),
    ),
  );
});

const npcTopicPermissions = {
  "organization.timers": {
    read: Permission.LOOTLOG_TIMERS_READ,
    heroes: Permission.LOOTLOG_TIMERS_HEROES_READ,
    titans: Permission.LOOTLOG_TIMERS_TITANS_READ,
  },
  "organization.chat": {
    read: Permission.LOOTLOG_CHAT_READ,
    heroes: Permission.LOOTLOG_CHAT_HEROES_READ,
    titans: Permission.LOOTLOG_CHAT_TITANS_READ,
  },
  "organization.notifications": {
    read: Permission.LOOTLOG_NOTIFICATIONS_READ,
    heroes: Permission.LOOTLOG_NOTIFICATIONS_HEROES_READ,
    titans: Permission.LOOTLOG_NOTIFICATIONS_TITANS_READ,
  },
  "organization.loots": {
    read: Permission.LOOTLOG_LOOTS_READ,
    heroes: Permission.LOOTLOG_LOOTS_HEROES_READ,
    titans: Permission.LOOTLOG_LOOTS_TITANS_READ,
  },
} as const;

const allNpcReadPermissions = Object.values(npcTopicPermissions).flatMap(
  (permissions) => Object.values(permissions),
);

const npcDeliveryCases = (
  npcType: string,
  npcLevel: number,
  tier: "heroes" | "titans",
) =>
  [
    [
      "timers update",
      RabbitRoutingKey.GUILDS_TIMERS_UPDATE,
      "organization.timers",
      { npc: { lvl: npcLevel, type: npcType } },
    ],
    [
      "timers delete",
      RabbitRoutingKey.GUILDS_TIMERS_DELETE,
      "organization.timers",
      { npcId: 105, routing: { tier, npcLevel } },
    ],
    [
      "NPC chat",
      RabbitRoutingKey.GUILDS_SEND_MESSAGE,
      "organization.chat",
      { type: "NPC", npc: { lvl: npcLevel, type: npcType } },
    ],
    [
      "NPC party chat",
      RabbitRoutingKey.GUILDS_SEND_MESSAGE,
      "organization.chat",
      { type: "PARTY_GATHERING", npc: { lvl: npcLevel, type: npcType } },
    ],
    [
      "system party chat update",
      RabbitRoutingKey.GUILDS_UPDATE_MESSAGE,
      "organization.chat",
      {
        messageId: "message",
        message: "changed",
        routing: { tier, npcLevel },
      },
    ],
    [
      "chat delete",
      RabbitRoutingKey.GUILDS_DELETE_MESSAGE,
      "organization.chat",
      { messageId: "message", routing: { tier, npcLevel } },
    ],
    [
      "NPC notification",
      RabbitRoutingKey.GUILDS_NOTIFICATIONS_SEND,
      "organization.notifications",
      { npc: { lvl: npcLevel, type: npcType } },
    ],
    [
      "loot share",
      RabbitRoutingKey.GUILDS_LOOTS_SHARE_UPDATE,
      "organization.loots",
      {
        version: 2,
        lootId: 1,
        npcs: [{ lvl: npcLevel, type: npcType }],
        lootShare: {},
      },
    ],
  ] as const;

for (const scenario of [
  {
    name: "level range",
    type: "HERO",
    level: 105,
    tier: "heroes",
    withholdTier: false,
  },
  {
    name: "titan permission",
    type: "TITAN",
    level: 250,
    tier: "titans",
    withholdTier: true,
  },
  {
    name: "hero permission",
    type: "HERO",
    level: 250,
    tier: "heroes",
    withholdTier: true,
  },
] as const) {
  for (const [name, routingKey, topic, data] of npcDeliveryCases(
    scenario.type,
    scenario.level,
    scenario.tier,
  )) {
    test(`${name} requires ${scenario.name} on game and web across gateways`, async () => {
      const { hubs } = await startHubs();
      const scope = { topic, organizationId: "organization-1" };
      const topicPermissions = npcTopicPermissions[topic];
      const tierPermission = topicPermissions[scenario.tier];

      const deniedPermissions = scenario.withholdTier
        ? allNpcReadPermissions.filter(
            (permission) => permission !== tierPermission,
          )
        : allNpcReadPermissions;

      const targets = hubs.flatMap((hub, i) =>
        (["game", "web-app"] as const).flatMap((platform) =>
          [false, true].map((allowed) => {
            const session = makeAdminSession(`${i}-${platform}-${allowed}`, {
              platform,
              guilds: [
                {
                  guild: { id: "organization-1", ownerId: "owner" },
                  roles: [
                    {
                      id: "permission",
                      permissions: allowed
                        ? [topicPermissions.read, tierPermission]
                        : deniedPermissions,
                      lvlRangeFrom: allowed ? 0 : 200,
                      lvlRangeTo: 500,
                    },
                    {
                      id: "empty",
                      permissions: [],
                      lvlRangeFrom: 0,
                      lvlRangeTo: 500,
                    },
                  ],
                },
              ],
            });

            const t = makeTestSocket(session);
            hub.register(t.socket);
            hub.subscribe(t.socket, scope);

            return { ...t, allowed };
          }),
        ),
      );

      const [local] = hubs;

      if (!local) throw new Error("Missing hub");
      const { bridge, deliver } = makeRabbitBridgeHarness(local);

      await Effect.runPromise(
        Effect.scoped(
          Effect.gen(function* () {
            yield* bridge.start();
            yield* deliver(
              routingKey,
              { guildId: "organization-1", ...data },
              { messageId: "npc-delivery" },
            );

            for (const t of targets.filter((t) => t.allowed))
              expect(t.sent).toHaveLength(1);

            for (const t of targets.filter((t) => !t.allowed))
              expect(t.sent).toHaveLength(0);
          }),
        ),
      );
    });
  }
}
