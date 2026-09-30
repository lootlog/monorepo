import { afterEach, describe, expect, it, vi } from "vitest";
import { createAccessPolicySnapshot } from "@lootlog/protocol/realtime/access-policy";
import {
  REALTIME_AIR_TAG_MAP_THREAT_CAPABILITY,
  type ServerEvent,
} from "@lootlog/protocol/realtime";
import type { AirTagMapThreatEvent } from "@lootlog/schema/air-tag";
import { Permission } from "@lootlog/schema/permissions";
import { createOnlinePlayersTest } from "@/features/online-players/online-players-test-fixtures";
import { MapThreatSource } from "./map-threat-source";
import { getSocket } from "./socket";

const policy = (location = true) =>
  createAccessPolicySnapshot(
    [
      {
        guild: { id: "guild-1", ownerId: "owner" },
        roles: [
          {
            permissions: [
              Permission.LOOTLOG_ONLINE_PLAYERS_READ,
              ...(location ? [Permission.LOOTLOG_PRESENCE_LOCATION_READ] : []),
            ],
            lvlRangeFrom: 1,
            lvlRangeTo: 300,
          },
        ],
      },
    ],
    "user",
  );

const threatData = (
  enemies: Array<{ targetId: string; ageMs: number; stasis?: boolean }>,
  { world = "alpha", mapId = 7, revision = 1 } = {},
): AirTagMapThreatEvent => ({
  guildId: "guild-1",
  world,
  mapId,
  mapName: "Karka-han",
  revision,
  enemies: enemies.map((enemy) => ({
    ...enemy,
    nickname: `Enemy ${enemy.targetId}`,
    clan: { id: 9, name: "Wrogowie" },
  })),
});

const threat = (...args: Parameters<typeof threatData>): ServerEvent => ({
  v: 1,
  type: "air-tag.map-threat-updated",
  data: threatData(...args),
});

async function setup({
  members = new Set<string>(),
  capabilities,
  location = true,
}: {
  members?: Set<string>;
  capabilities?: string[];
  location?: boolean;
} = {}) {
  const harness = createOnlinePlayersTest();
  getSocket().connect();
  harness.open();
  await harness.join(["guild-1"], policy(location), capabilities);
  let now = 1_000_000;
  const memberListeners = new Set<() => void>();

  const source = new MapThreatSource(
    getSocket(),
    "guild-1",
    "alpha",
    {
      isOnlineMember: (characterId) => members.has(characterId),
      subscribeChanges: (listener) => {
        memberListeners.add(listener);

        return () => memberListeners.delete(listener);
      },
    },
    () => now,
  );

  const changeMembers = async (next: Iterable<string>) => {
    members.clear();

    for (const characterId of next) members.add(characterId);

    for (const listener of memberListeners) listener();
    await Promise.resolve();
  };

  const release = source.retain();
  const changed = vi.fn();
  source.subscribeMap("Karka-han", changed);
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });

  const advance = (ms: number) => {
    now += ms;
    vi.advanceTimersByTime(ms);
  };

  return { harness, source, release, changed, advance, changeMembers };
}

describe("map threat source", () => {
  afterEach(() => vi.useRealTimers());

  it("counts only fresh sightings, ages them from the gateway's age, and expires them without another event", async () => {
    const { harness, source, release, changed, advance } = await setup();

    await harness.receive(
      threat([{ targetId: "1", ageMs: 4_000 }], { world: "beta" }),
    );
    expect(source.getMapThreat("Karka-han")).toBeUndefined();

    await harness.receive(
      threat([
        { targetId: "1", ageMs: 4_000 },
        { targetId: "2", ageMs: 0, stasis: true },
      ]),
    );
    expect(source.getMapThreat("Karka-han")).toMatchObject({ freshCount: 2 });

    // The sighting reported 4 s old turns stale first.
    advance(6_000);
    expect(source.getMapThreat("Karka-han")).toMatchObject({
      freshCount: 1,
      enemies: [{ targetId: "2" }, { targetId: "1" }],
    });
    advance(4_000);
    expect(source.getMapThreat("Karka-han")?.freshCount).toBe(0);
    advance(16_000);
    expect(source.getMapThreat("Karka-han")?.enemies).toEqual([
      expect.objectContaining({ targetId: "2" }),
    ]);
    advance(4_000);
    expect(source.getMapThreat("Karka-han")).toBeUndefined();
    expect(changed).toHaveBeenCalledTimes(5);
    release();
  });

  it("keeps the newer list when two gateway instances deliver out of order and hides online members", async () => {
    const { harness, source, release } = await setup({
      members: new Set(["3"]),
    });

    await harness.receive(
      threat(
        [
          { targetId: "1", ageMs: 0, stasis: false },
          { targetId: "3", ageMs: 0 },
        ],
        { revision: 20 },
      ),
    );
    await harness.receive(
      threat([{ targetId: "1", ageMs: 0, stasis: true }], { revision: 10 }),
    );
    expect(source.getMapThreat("Karka-han")?.enemies).toEqual([
      expect.objectContaining({ targetId: "1", stasis: false }),
    ]);

    // Another map with the same name keeps its own list.
    await harness.receive(
      threat([{ targetId: "2", ageMs: 0 }], { mapId: 8, revision: 5 }),
    );
    expect(source.getMapThreat("Karka-han")?.freshCount).toBe(2);

    // The last enemy left map 7: its fresh sighting goes at once.
    await harness.receive(threat([], { revision: 30 }));
    expect(source.getMapThreat("Karka-han")?.enemies).toEqual([
      expect.objectContaining({ targetId: "2" }),
    ]);
    release();
  });

  it("drops a target once presence identifies it as an online member", async () => {
    const { harness, source, release, changeMembers } = await setup();

    await harness.receive(threat([{ targetId: "3", ageMs: 0 }]));
    expect(source.getMapThreat("Karka-han")).toBeDefined();

    await changeMembers(["3"]);
    expect(source.getMapThreat("Karka-han")).toBeUndefined();
    release();
  });

  it("fetches stored sightings once precise-location access is granted", async () => {
    const { harness, release } = await setup({
      location: false,
      capabilities: [REALTIME_AIR_TAG_MAP_THREAT_CAPABILITY],
    });

    const fetches = () =>
      harness.wire.frames.filter(
        (frame) =>
          "type" in frame && frame.type === "air-tag.map-threats.fetch",
      ).length;

    expect(fetches()).toBe(0);
    await harness.receive({
      v: 1,
      type: "permissions.updated",
      data: {
        organizationIds: ["guild-1"],
        subscriptionScopes: [],
        accessPolicy: policy(true),
      },
    });
    expect(fetches()).toBe(1);
    release();
  });

  it("hydrates sightings made before it connected from a gateway that supports the fetch", async () => {
    const { harness, source, release } = await setup({
      capabilities: [REALTIME_AIR_TAG_MAP_THREAT_CAPABILITY],
    });

    const request = harness.wire.frames.findLast(
      (frame) => "type" in frame && frame.type === "air-tag.map-threats.fetch",
    );

    if (!request || !("requestId" in request) || !request.requestId)
      throw new Error("Expected a map threat fetch");
    harness.wire.receive({
      v: 1,
      requestId: request.requestId,
      status: "success",
      data: { threats: [threatData([{ targetId: "1", ageMs: 15_000 }])] },
    });
    await vi.waitFor(() =>
      expect(source.getMapThreat("Karka-han")).toMatchObject({
        freshCount: 0,
        enemies: [{ targetId: "1" }],
      }),
    );
    release();
  });

  it.each(["disconnect", "location revocation"])(
    "forgets threats after %s and ignores sightings it may no longer read",
    async (invalidation) => {
      const { harness, source, release } = await setup();

      await harness.receive(threat([{ targetId: "1", ageMs: 0 }]));
      expect(source.getMapThreat("Karka-han")).toBeDefined();

      if (invalidation === "disconnect") {
        harness.realtime.disconnect();
      } else {
        await harness.receive({
          v: 1,
          type: "permissions.updated",
          data: {
            organizationIds: ["guild-1"],
            subscriptionScopes: [],
            accessPolicy: policy(false),
          },
        });
        await harness.receive(threat([{ targetId: "1", ageMs: 0 }]));
      }

      expect(source.getMapThreat("Karka-han")).toBeUndefined();
      release();
    },
  );
});
