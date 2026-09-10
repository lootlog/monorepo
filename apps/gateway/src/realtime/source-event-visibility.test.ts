import type { NpcRoutingData } from "@lootlog/schema/npc-routing";
import { describe, expect, test } from "bun:test";
import { Permission } from "@lootlog/schema/permissions";
import type { ServerEvent } from "@lootlog/protocol/realtime";
import type { SessionData } from "./session.js";
import { canReadSourceEvent } from "./source-event-visibility.js";
import { canSubscribe } from "./subscription-policy.js";

type Event = typeof ServerEvent.Type;
const role = (permissions: Permission[], from = 200, to = 500) => ({
  id: "role",
  permissions,
  lvlRangeFrom: from,
  lvlRangeTo: to,
});
const reader = (
  roles: SessionData["guilds"][number]["roles"],
): SessionData => ({
  discordId: "member",
  userId: "user",
  connectionId: "connection",
  platform: "game",
  joined: true,
  guilds: [{ guild: { id: "organization", ownerId: "owner" }, roles }],
  subscriptions: new Map(),
  airTagScopes: [],
  confidence: "reported",
  backpressureStrikes: 0,
});
const timer = (
  npc: (NpcRoutingData & { lvl?: number }) | null | undefined,
): Event => ({
  v: 1,
  type: "timer.created",
  data: {
    organizationId: "organization",
    payload: { guildId: "organization", npc },
  },
});
const timerDeleted = (
  routing: { tier?: string; npcLevel?: number } | undefined,
): Event => ({
  v: 1,
  type: "timer.deleted",
  data: {
    organizationId: "organization",
    payload: { guildId: "organization", routing },
  },
});
const timerRead = [
  Permission.LOOTLOG_TIMERS_READ,
  Permission.LOOTLOG_TIMERS_HEROES_READ,
  Permission.LOOTLOG_TIMERS_TITANS_READ,
];

describe("source visibility at delivery", () => {
  test.each([
    "event.map-status-updated",
    "event.hero-killed",
    "event.respawn-window-opened",
    "event.respawn-window-closed",
  ] as const)(
    "%s uses the HTTP hero visibility policy and rejects missing source metadata",
    (type) => {
      const session = reader([
        role([Permission.LOOTLOG_EVENTS_READ], 100, 200),
      ]);
      const event = (
        heroNpcLvl: number | string | null | undefined,
        guildId = "organization",
      ): Event => ({
        v: 1,
        type,
        data: {
          organizationId: "organization",
          payload: { guildId, heroNpcLvl },
        },
      });
      for (const level of [100, 200, 0, null])
        expect(canReadSourceEvent(session, event(level))).toBe(true);
      for (const level of [99, 201, undefined, "100", -1, Number.NaN])
        expect(canReadSourceEvent(session, event(level))).toBe(false);
      expect(
        canReadSourceEvent(session, event(100, "another-organization")),
      ).toBe(false);
      expect(canReadSourceEvent(reader([role([], 100, 200)]), event(100))).toBe(
        false,
      );
      expect(
        canReadSourceEvent(
          reader([role([Permission.ADMIN], 100, 200)]),
          event(300),
        ),
      ).toBe(true);
      session.guilds = session.guilds.map((guild) => ({
        ...guild,
        roles: [...guild.roles, role([], 250, 350)],
      }));
      // Event visibility intentionally accepts the level range from any role, as HTTP does.
      expect(canReadSourceEvent(session, event(300))).toBe(true);
    },
  );

  test.each([
    [199, false],
    [200, true],
    [500, true],
    [501, false],
  ] as const)("timer range includes boundaries: level %i", (level, visible) => {
    const session = reader([role(timerRead), role([], 0, 500)]);
    expect(
      canReadSourceEvent(session, timer({ type: "HERO", lvl: level })),
    ).toBe(visible);
    expect(
      canReadSourceEvent(
        session,
        timerDeleted({ tier: "heroes", npcLevel: level }),
      ),
    ).toBe(visible);
  });
  test("does not borrow titan access from a role whose range does not cover the NPC", () => {
    const session = reader([
      role([Permission.LOOTLOG_TIMERS_READ]),
      role([Permission.LOOTLOG_TIMERS_TITANS_READ], 0, 199),
      role([], 0, 500),
    ]);
    expect(
      canReadSourceEvent(session, timer({ type: "TITAN", lvl: 250 })),
    ).toBe(false);
    expect(
      canReadSourceEvent(
        session,
        timerDeleted({ tier: "titans", npcLevel: 250 }),
      ),
    ).toBe(false);
  });
  test("requires base access as well as tier access, even for an old subscription", () => {
    expect(
      canReadSourceEvent(
        reader([role([Permission.LOOTLOG_TIMERS_TITANS_READ])]),
        timer({ type: "TITAN", lvl: 250 }),
      ),
    ).toBe(false);
  });
  test.each(["HERO", "EVENT_HERO", "TITAN"])(
    "does not treat %s as a base timer",
    (type) => {
      expect(
        canReadSourceEvent(
          reader([role([Permission.LOOTLOG_TIMERS_READ])]),
          timer({ type, lvl: 250 }),
        ),
      ).toBe(false);
    },
  );
  test.each([
    undefined,
    null,
    {},
    { lvl: 250 },
    { type: "TITAN" },
    { type: "unknown", lvl: 250 },
    { type: "HERO", lvl: -1 },
    { type: "HERO", lvl: Infinity },
  ])("rejects missing or invalid NPC source %j", (npc) => {
    expect(canReadSourceEvent(reader([role(timerRead)]), timer(npc))).toBe(
      false,
    );
  });
  test.each([
    undefined,
    {},
    { tier: "base" },
    { tier: "wrong", npcLevel: 250 },
    { tier: "heroes", npcLevel: -1 },
  ])("rejects missing or invalid deletion routing %j", (routing) => {
    expect(
      canReadSourceEvent(reader([role(timerRead)]), timerDeleted(routing)),
    ).toBe(false);
  });
  test("recognizes raw game NPC weight without downgrading hero or titan access", () => {
    const baseReader = reader([role([Permission.LOOTLOG_TIMERS_READ])]);
    const tierReader = reader([role(timerRead)]);
    for (const wt of [80, "100"]) {
      const event = timer({ type: 1, wt, prof: "w", lvl: 250 });
      expect(canReadSourceEvent(baseReader, event)).toBe(false);
      expect(canReadSourceEvent(tierReader, event)).toBe(true);
    }
  });

  test("keeps administrator and owner bypasses for valid timers", () => {
    const administrator = reader([role([Permission.ADMIN], 0, 0)]);
    const owner = { ...reader([]), discordId: "owner" };
    for (const session of [administrator, owner]) {
      expect(
        canReadSourceEvent(session, timer({ type: "TITAN", lvl: 550 })),
      ).toBe(true);
      expect(
        canReadSourceEvent(
          session,
          timerDeleted({ tier: "titans", npcLevel: 550 }),
        ),
      ).toBe(true);
    }
  });
  test("checks current roles after access is removed", () => {
    const session = reader([role(timerRead)]);
    const event = timer({ type: "TITAN", lvl: 250 });
    expect(canReadSourceEvent(session, event)).toBe(true);
    session.guilds = reader([role([])]).guilds;
    expect(canReadSourceEvent(session, event)).toBe(false);
  });
  test("rejects cross-organization sources and recipients", () => {
    const session = reader([role(timerRead)]);
    expect(
      canReadSourceEvent(session, {
        v: 1,
        type: "timer.created",
        data: {
          organizationId: "organization",
          payload: { guildId: "other", npc: { type: "HERO", lvl: 250 } },
        },
      }),
    ).toBe(false);
    session.guilds = [];
    expect(canReadSourceEvent(session, timer({ type: "HERO", lvl: 250 }))).toBe(
      false,
    );
  });
  test("keeps ordinary chat and text notifications independent of NPC level", () => {
    const session = reader([
      role(
        [Permission.LOOTLOG_CHAT_READ, Permission.LOOTLOG_NOTIFICATIONS_READ],
        400,
        500,
      ),
    ]);
    for (const type of ["chat.created", "notification.sent"] as const)
      expect(
        canReadSourceEvent(session, {
          v: 1,
          type,
          data: {
            organizationId: "organization",
            payload: { type: "NORMAL", message: "text" },
          },
        }),
      ).toBe(true);
    for (const type of ["chat.updated", "chat.deleted"] as const)
      expect(
        canReadSourceEvent(session, {
          v: 1,
          type,
          data: {
            organizationId: "organization",
            payload: { routing: { tier: "base" } },
          },
        }),
      ).toBe(true);
  });
  test("restricts member refresh status and its subscription to administrators", () => {
    const scope = {
      topic: "organization.members",
      organizationId: "organization",
    } as const;
    const event = {
      v: 1,
      type: "member-refresh.updated",
      data: {
        organizationId: "organization",
        payload: { failedIds: ["member-id"] },
      },
    } as const;
    const member = reader([role([Permission.LOOTLOG_MEMBERS_READ])]);
    expect(canSubscribe(member, scope)).toBe(false);
    expect(canReadSourceEvent(member, event)).toBe(false);
    for (const session of [
      reader([role([Permission.ADMIN])]),
      { ...reader([]), discordId: "owner" },
    ]) {
      expect(canSubscribe(session, scope)).toBe(true);
      expect(canReadSourceEvent(session, event)).toBe(true);
    }
  });
});

test("NPC gathering updates retain source tier and level restrictions after signup", () => {
  const update = (lvl: number): Event => ({
    v: 1,
    type: "party-ready-room.updated",
    data: {
      organizationId: "organization",
      payload: { type: "UPSERT", projection: { npc: { type: "HERO", lvl } } },
    },
  });
  expect(
    canReadSourceEvent(
      reader([role([Permission.LOOTLOG_CHAT_READ], 100, 200)]),
      update(150),
    ),
  ).toBe(false);
  const session = reader([
    role(
      [Permission.LOOTLOG_CHAT_READ, Permission.LOOTLOG_CHAT_HEROES_READ],
      100,
      200,
    ),
  ]);
  expect(canReadSourceEvent(session, update(150))).toBe(true);
  expect(canReadSourceEvent(session, update(250))).toBe(false);
});

test("gathering organizers retain their own NPC updates with sending permission", () => {
  const update = (
    organizerDiscordId = "member",
    guildIds = ["organization"],
  ): Event => ({
    v: 1,
    type: "party-ready-room.updated",
    data: {
      organizationId: "organization",
      payload: {
        type: "UPSERT",
        projection: {
          organizerDiscordId,
          guildIds,
          npc: { type: "TITAN", lvl: 0 },
        },
      },
    },
  });
  for (const permission of [
    Permission.LOOTLOG_NOTIFICATIONS_SEND,
    Permission.OWNER,
    Permission.LOOTLOG_MANAGE,
  ]) {
    const session = reader([role([permission], 100, 200)]);
    expect(canReadSourceEvent(session, update())).toBe(true);
    expect(canReadSourceEvent(session, update("another-organizer"))).toBe(
      false,
    );
    expect(
      canReadSourceEvent(session, update("member", ["another-organization"])),
    ).toBe(false);
    session.guilds = [];
    expect(canReadSourceEvent(session, update())).toBe(false);
  }
  expect(canReadSourceEvent(reader([role([])]), update())).toBe(false);
});
