import { afterEach, expect, it, vi } from "vitest";
import {
  createAccessPolicySnapshot,
  diffAccessPolicies,
} from "@lootlog/protocol/realtime/access-policy";
import { Permission } from "@lootlog/schema/permissions";

import { createAirTagTest } from "./air-tag-test";
import { useGameStore } from "@/store/game.store";

import { airTagReceiveController } from "./air-tag-receive-controller";

afterEach(() => {
  airTagReceiveController.clear();
  airTagReceiveController.retainOrganizations();
  vi.useRealTimers();
  vi.clearAllMocks();
});

it("keeps authorized air targets while coalescing grants and excludes revoked targets from late acknowledgements", async () => {
  vi.useFakeTimers();
  useGameStore.getState().replaceGame({
    hero: {
      accountId: "1",
      characterId: "1",
      currentHp: 1,
      maxHp: 1,
      icon: "hero.gif",
      level: 100,
      name: "Hero",
      profession: "w",
      x: 1,
      y: 2,
    },
    interface: "ni",
    map: { id: 12, name: "Torneg", visibility: 30 },
    world: "fobos",
  });
  const makePolicy = (ids: string[]) =>
    createAccessPolicySnapshot(
      ids.map((id) => ({
        guild: { id, ownerId: "owner" },
        roles: [
          {
            permissions: [Permission.LOOTLOG_ONLINE_PLAYERS_READ],
            lvlRangeFrom: 1,
            lvlRangeTo: 300,
          },
        ],
      })),
      "user",
    );
  const initial = makePolicy(["guild-1"]);
  const expanded = makePolicy(["guild-1", "guild-2"]);
  const expandedAgain = makePolicy(["guild-1", "guild-2", "guild-3"]);
  const restricted = makePolicy(["guild-2"]);
  const test = createAirTagTest();
  const { runtime } = test;
  try {
    runtime.handlePermissionsUpdated({
      accessPolicy: initial,
      changes: diffAccessPolicies(makePolicy([]), initial),
    });
    runtime.configure({ connected: true, enabled: true, joined: true });
    await test.acknowledge();
    expect(
      airTagReceiveController.getRenderableTargets(Date.now(), 10_000),
    ).toHaveLength(1);
    test.wire.frames.length = 0;
    runtime.handlePermissionsUpdated({
      accessPolicy: initial,
      changes: [
        {
          organizationId: "guild-1",
          areas: ["timers"],
          expanded: true,
          restricted: false,
        },
      ],
    });
    expect(test.subscriptions()).toHaveLength(0);
    runtime.handlePermissionsUpdated({
      accessPolicy: expanded,
      changes: diffAccessPolicies(initial, expanded),
    });
    vi.advanceTimersByTime(4000);
    runtime.handlePermissionsUpdated({
      accessPolicy: expandedAgain,
      changes: diffAccessPolicies(expanded, expandedAgain),
    });
    expect(
      airTagReceiveController.getRenderableTargets(Date.now(), 10_000),
    ).toHaveLength(1);
    vi.advanceTimersByTime(4999);
    expect(test.subscriptions()).toHaveLength(0);
    vi.advanceTimersByTime(1);
    expect(test.subscriptions()).toHaveLength(1);
    expect(
      airTagReceiveController.getRenderableTargets(Date.now(), 10_000),
    ).toHaveLength(1);
    runtime.handlePermissionsUpdated({
      accessPolicy: restricted,
      changes: diffAccessPolicies(expandedAgain, restricted),
    });
    expect(
      airTagReceiveController.getRenderableTargets(Date.now(), 10_000),
    ).toEqual([]);
    await test.acknowledge();
    expect(
      airTagReceiveController.getRenderableTargets(Date.now(), 10_000),
    ).toEqual([expect.objectContaining({ targetId: "guild-2" })]);
    expect(test.subscriptions()).toHaveLength(1);
    test.wire.frames.length = 0;
    runtime.handlePermissionsUpdated();
    runtime.handlePermissionsUpdated();
    expect(
      airTagReceiveController.getRenderableTargets(Date.now(), 10_000),
    ).toEqual([]);
    vi.advanceTimersByTime(4999);
    expect(test.subscriptions()).toHaveLength(0);
    vi.advanceTimersByTime(1);
    expect(test.subscriptions()).toHaveLength(1);
  } finally {
    runtime.shutdown();
  }
});
