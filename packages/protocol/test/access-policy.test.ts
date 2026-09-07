import { describe, expect, test } from "bun:test";
import { Permission } from "@lootlog/schema/permissions";
import {
  canReadPolicyNpc,
  createAccessPolicySnapshot,
  diffAccessPolicies,
  isAccessPolicySnapshot,
} from "../src/realtime/access-policy.js";

const role = (permissions: Permission[], from = 0, to = 500) => ({
  permissions,
  lvlRangeFrom: from,
  lvlRangeTo: to,
});
const guild = (roles: ReturnType<typeof role>[], id = "one") => ({
  guild: { id, ownerId: "owner" },
  roles,
});
const snapshot = (guilds: ReturnType<typeof guild>[], viewer = "member") =>
  createAccessPolicySnapshot(guilds, viewer);

describe("realtime effective access policy", () => {
  test("duplicate and overlapping grants, role and organization ordering do not change access", () => {
    const a = guild([role([Permission.LOOTLOG_TIMERS_READ], 0, 500)]);
    const b = guild([role([Permission.LOOTLOG_CHAT_READ])], "two");
    const previous = snapshot([a, b]);
    const next = snapshot([
      b,
      guild([
        role([Permission.LOOTLOG_TIMERS_READ], 200, 500),
        role([Permission.LOOTLOG_TIMERS_READ], 0, 300),
        role([Permission.LOOTLOG_TIMERS_READ], 0, 300),
      ]),
    ]);
    expect(next.version).toBe(previous.version);
    expect(diffAccessPolicies(previous, next)).toEqual([]);
    expect(isAccessPolicySnapshot(next)).toBe(true);
  });

  test("tier revocation and narrower levels affect only timers of their organization", () => {
    const unaffected = guild([role([Permission.LOOTLOG_CHAT_READ])], "two");
    const previous = snapshot([
      guild([
        role([
          Permission.LOOTLOG_TIMERS_READ,
          Permission.LOOTLOG_TIMERS_TITANS_READ,
          Permission.LOOTLOG_CHAT_READ,
        ]),
      ]),
      unaffected,
    ]);
    const next = snapshot([
      guild([
        role([Permission.LOOTLOG_TIMERS_READ], 200, 500),
        role([Permission.LOOTLOG_CHAT_READ]),
      ]),
      unaffected,
    ]);
    expect(diffAccessPolicies(previous, next)).toEqual([
      {
        organizationId: "one",
        areas: ["timers"],
        restricted: true,
        expanded: false,
      },
    ]);
    const policy = next.organizations[0];
    if (!policy) throw new Error("Missing fixture policy");
    expect(
      canReadPolicyNpc(policy, "timers", { type: "TITAN", lvl: 250 }),
    ).toBe(false);
    expect(
      canReadPolicyNpc(policy, "timers", { type: "ELITE2", lvl: 100 }),
    ).toBe(false);
    expect(
      canReadPolicyNpc(policy, "timers", { type: "ELITE2", lvl: 250 }),
    ).toBe(true);
    expect(canReadPolicyNpc(policy, "chat", null)).toBe(true);
  });

  test("expansion never marks a restriction and range shifts report both directions", () => {
    const previous = snapshot([
      guild([role([Permission.LOOTLOG_TIMERS_READ], 100, 200)]),
    ]);
    const expanded = snapshot([
      guild([role([Permission.LOOTLOG_TIMERS_READ], 0, 500)]),
    ]);
    const shifted = snapshot([
      guild([role([Permission.LOOTLOG_TIMERS_READ], 150, 250)]),
    ]);
    expect(diffAccessPolicies(previous, expanded)).toEqual([
      {
        organizationId: "one",
        areas: ["timers"],
        restricted: false,
        expanded: true,
      },
    ]);
    expect(diffAccessPolicies(previous, shifted)).toEqual([
      {
        organizationId: "one",
        areas: ["timers"],
        restricted: true,
        expanded: true,
      },
    ]);
  });

  test("removed organizations affect every area without changing remaining organizations", () => {
    const one = guild([role([Permission.LOOTLOG_TIMERS_READ])]);
    const two = guild([role([Permission.LOOTLOG_CHAT_READ])], "two");
    const changes = diffAccessPolicies(snapshot([one, two]), snapshot([two]));
    expect(changes).toHaveLength(1);
    expect(changes[0]).toMatchObject({
      organizationId: "one",
      restricted: true,
      expanded: false,
    });
    expect(changes[0]?.areas).toContain("chat");
    expect(changes[0]?.areas).toContain("timers");
  });

  test("administrator NPC reads ignore redundant grants while loot ranges remain significant", () => {
    const previous = snapshot([guild([role([Permission.ADMIN])])]);
    const next = snapshot([
      guild([
        role([Permission.ADMIN]),
        role([Permission.LOOTLOG_TIMERS_TITANS_READ], 100, 200),
      ]),
    ]);
    expect(next.version).toBe(previous.version);
    const withLoot = snapshot([
      guild([
        role([Permission.ADMIN]),
        role(
          [Permission.LOOTLOG_LOOTS_READ, Permission.LOOTLOG_LOOTS_TITANS_READ],
          100,
          200,
        ),
      ]),
    ]);
    expect(diffAccessPolicies(previous, withLoot)).toEqual([
      {
        organizationId: "one",
        areas: ["loots"],
        restricted: false,
        expanded: true,
      },
    ]);
    const policy = next.organizations[0];
    if (!policy) throw new Error("Missing fixture policy");
    expect(
      canReadPolicyNpc(policy, "timers", { type: "TITAN", lvl: 700 }),
    ).toBe(true);
    expect(
      canReadPolicyNpc(policy, "timers", { type: "INVALID", lvl: 700 }),
    ).toBe(false);
  });

  test("NPC tiers require base feature access and role-granted level coverage", () => {
    const previous = snapshot([
      guild([role([Permission.LOOTLOG_CHAT_TITANS_READ])]),
    ]);
    const policy = previous.organizations[0];
    if (!policy) throw new Error("Missing fixture policy");
    expect(canReadPolicyNpc(policy, "chat", { type: "TITAN", lvl: 250 })).toBe(
      false,
    );
    expect(canReadPolicyNpc(policy, "chat", null)).toBe(false);
  });
});

test("loot tier coverage keeps the base grant on the same role", () => {
  const split = snapshot([
    guild([
      role([Permission.LOOTLOG_LOOTS_READ]),
      role([Permission.LOOTLOG_LOOTS_TITANS_READ]),
    ]),
  ]);
  const combined = snapshot([
    guild([
      role([
        Permission.LOOTLOG_LOOTS_READ,
        Permission.LOOTLOG_LOOTS_TITANS_READ,
      ]),
    ]),
  ]);
  expect(diffAccessPolicies(split, combined)).toEqual([
    {
      organizationId: "one",
      areas: ["loots"],
      restricted: false,
      expanded: true,
    },
  ]);
});
