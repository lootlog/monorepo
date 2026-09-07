import { afterEach, expect, it, vi } from "vitest";
import {
  createAccessPolicySnapshot,
  diffAccessPolicies,
} from "@lootlog/protocol/realtime/access-policy";
import { Permission } from "@lootlog/schema/permissions";
import type { AirTagSubscriptionAck } from "@lootlog/schema/air-tag";
import { GatewayEvent } from "@/config/gateway";
import { useGameStore } from "@/store/game.store";
import { AirTagRuntime } from "./air-tag-runtime";
import { airTagReceiveController } from "./air-tag-receive-controller";

const transport = vi.hoisted(() => ({ emit: vi.fn() }));
vi.mock("@/lib/socket", () => ({ getSocket: () => transport }));
vi.mock("./air-tag-renderer", () => ({
  airTagRenderer: { register: vi.fn(), unregister: vi.fn() },
}));

afterEach(() => {
  airTagReceiveController.clear();
  airTagReceiveController.retainOrganizations();
  vi.useRealTimers();
  vi.clearAllMocks();
});

it("keeps authorized air targets while coalescing grants and excludes revoked targets from late acknowledgements", () => {
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
  const runtime = new AirTagRuntime();
  const acknowledgeLastSubscription = () => {
    const call = transport.emit.mock.calls
      .filter(([event]) => event === GatewayEvent.AIR_TAG_SUBSCRIPTION)
      .at(-1);
    if (!call) throw new Error("Expected air subscription");
    const payload = call[1] as { requestId: string };
    const acknowledge = call[2] as (ack: AirTagSubscriptionAck) => void;
    acknowledge({
      status: "accepted",
      requestId: payload.requestId,
      scopes: ["guild-1", "guild-2"].map((guildId) => ({
        guildId,
        world: "fobos",
        mapId: 12,
        epochId: "epoch",
        epochStartedAt: 100,
        revision: 1,
        targets: [
          {
            targetId: guildId,
            nickname: guildId,
            relation: 1,
            x: 10,
            y: 10,
            observedAt: Date.now(),
          },
        ],
      })),
    });
  };
  try {
    runtime.handlePermissionsUpdated({
      accessPolicy: initial,
      changes: diffAccessPolicies(makePolicy([]), initial),
    });
    runtime.configure({ connected: true, enabled: true, joined: true });
    acknowledgeLastSubscription();
    expect(
      airTagReceiveController.getRenderableTargets(Date.now(), 10_000),
    ).toHaveLength(1);
    transport.emit.mockClear();
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
    expect(transport.emit).not.toHaveBeenCalled();
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
    expect(transport.emit).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(transport.emit).toHaveBeenCalledTimes(1);
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
    acknowledgeLastSubscription();
    expect(
      airTagReceiveController.getRenderableTargets(Date.now(), 10_000),
    ).toEqual([expect.objectContaining({ targetId: "guild-2" })]);
    expect(transport.emit).toHaveBeenCalledTimes(1);
    transport.emit.mockClear();
    runtime.handlePermissionsUpdated();
    runtime.handlePermissionsUpdated();
    expect(
      airTagReceiveController.getRenderableTargets(Date.now(), 10_000),
    ).toEqual([]);
    vi.advanceTimersByTime(4999);
    expect(transport.emit).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(transport.emit).toHaveBeenCalledTimes(1);
  } finally {
    runtime.shutdown();
  }
});
