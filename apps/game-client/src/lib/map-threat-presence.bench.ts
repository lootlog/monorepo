import { createAccessPolicySnapshot } from "@lootlog/protocol/realtime/access-policy";
import type { ServerEvent } from "@lootlog/protocol/realtime";
import { Permission } from "@lootlog/schema/permissions";
import { describe, expect, test } from "vitest";
import { createOnlinePlayersTest } from "@/features/online-players/online-players-test-fixtures";
import { MapThreatSource } from "./map-threat-source";
import type { PlayerPresence } from "./online-players-presence";
import { PresenceMapIndex } from "./presence-map-index";
import { getSocket } from "./socket";

const MEMBERS = 300;

const MAPS = 20;

const ENEMIES_PER_MAP = 5;

const policy = createAccessPolicySnapshot(
  [
    {
      guild: { id: "guild-1", ownerId: "owner" },
      roles: [
        {
          permissions: [
            Permission.LOOTLOG_ONLINE_PLAYERS_READ,
            Permission.LOOTLOG_PRESENCE_LOCATION_READ,
          ],
          lvlRangeFrom: 1,
          lvlRangeTo: 300,
        },
      ],
    },
  ],
  "user",
);

const memberPresence = (member: number, map: number): PlayerPresence => ({
  discordId: `discord-${member}`,
  sessionId: `session-${member}`,
  status: "online",
  isAfk: false,
  mapName: `Map ${map}`,
  player: {
    world: "alpha",
    name: `Member ${member}`,
    lvl: 200,
    icon: "",
    characterId: String(member),
    accountId: String(10_000 + member),
    prof: "w",
  },
});

const threat = (map: number): ServerEvent => ({
  v: 1,
  type: "air-tag.map-threat-updated",
  data: {
    guildId: "guild-1",
    world: "alpha",
    mapId: map,
    mapName: `Map ${map}`,
    revision: 1,
    enemies: Array.from({ length: ENEMIES_PER_MAP }, (_, enemy) => ({
      targetId: `enemy-${map}-${enemy}`,
      nickname: `Enemy ${map}-${enemy}`,
      ageMs: 0,
      clan: { id: 9, name: "Wrogowie" },
    })),
  },
});

describe(`map threats with ${MEMBERS} online members and ${MAPS} threatened maps`, () => {
  test("member moves to another map", async ({ bench }) => {
    const harness = createOnlinePlayersTest();
    getSocket().connect();
    harness.open();
    await harness.join(["guild-1"], policy);
    const index = new PresenceMapIndex();
    const memberListeners = new Set<(presence?: PlayerPresence) => void>();

    for (let member = 0; member < MEMBERS; member += 1)
      index.apply(memberPresence(member, member % MAPS));

    const source = new MapThreatSource(getSocket(), "guild-1", "alpha", {
      isOnlineMember: (characterId) => index.hasCharacter(characterId),
      subscribeChanges: (listener) => {
        memberListeners.add(listener);

        return () => memberListeners.delete(listener);
      },
    });

    const release = source.retain();

    await Promise.all(
      Array.from({ length: MAPS }, (_, map) => harness.receive(threat(map))),
    );

    expect(source.getMapThreat("Map 0")?.enemies).toHaveLength(ENEMIES_PER_MAP);
    let step = 0;

    const result = await bench("member moves to another map", async () => {
      step += 1;
      const member = step % MEMBERS;
      // Each visit sends the member one map further than the last one.
      const map = (member + 1 + Math.floor(step / MEMBERS)) % MAPS;
      const moved = memberPresence(member, map);
      index.apply(moved);

      for (const listener of memberListeners) listener(moved);
      await Promise.resolve();
    }).run({ iterations: 5_000, warmupIterations: 500 });

    release();
    expect(result.latency.samplesCount).toBeGreaterThan(0);
  });
});
