import { afterEach, describe, expect, it, vi } from "vitest";
import { createAccessPolicySnapshot } from "@lootlog/protocol/realtime/access-policy";
import {
  REALTIME_NPC_PRESENCE_CAPABILITY,
  type ServerEvent,
} from "@lootlog/protocol/realtime";
import type { NpcPresenceSnapshot } from "@lootlog/schema/npc-presence";
import { Permission } from "@lootlog/schema/permissions";
import { createOnlinePlayersTest } from "@/features/online-players/online-players-test-fixtures";
import { NpcPresenceSource } from "./npc-presence-source";
import { getSocket } from "./socket";

const npc = { id: 101, lvl: 120, wt: 25, prof: "w", type: 2 };

const presence = (
  standing: boolean,
  revision: number,
  { world = "alpha", since = 5_000 } = {},
): ServerEvent => ({
  v: 1,
  type: "npc-presence.updated",
  data: {
    organizationId: "guild-1",
    world,
    revision,
    npc,
    standing,
    since,
  },
});

async function setup() {
  const harness = createOnlinePlayersTest();
  getSocket().connect();
  harness.open();
  await harness.join(
    ["guild-1"],
    createAccessPolicySnapshot(
      [
        {
          guild: { id: "guild-1", ownerId: "owner" },
          roles: [
            {
              permissions: [Permission.LOOTLOG_TIMERS_READ],
              lvlRangeFrom: 1,
              lvlRangeTo: 300,
            },
          ],
        },
      ],
      "user",
    ),
    [REALTIME_NPC_PRESENCE_CAPABILITY],
  );

  const source = new NpcPresenceSource(getSocket(), "guild-1", "alpha");
  const release = source.retain();
  const changed = vi.fn();
  source.subscribeNpc(npc.id, changed);

  const answerFetch = (data: NpcPresenceSnapshot) => {
    const request = harness.wire.frames.findLast(
      (frame) => "type" in frame && frame.type === "npc-presence.fetch",
    );

    if (!request || !("requestId" in request) || !request.requestId)
      throw new Error("Expected an NPC presence fetch");
    harness.wire.receive({
      v: 1,
      requestId: request.requestId,
      status: "success",
      data,
    });
  };

  return { harness, source, release, changed, answerFetch };
}

describe("NPC presence source", () => {
  afterEach(() => vi.useRealTimers());

  it("never lets a delayed update or an older snapshot resurrect an NPC that stopped standing", async () => {
    const { harness, source, release, answerFetch } = await setup();

    await harness.receive(presence(true, 4, { world: "beta" }));
    expect(source.getStandingSince(npc.id)).toBeUndefined();

    await harness.receive(presence(true, 4));
    expect(source.getStandingSince(npc.id)).toBe(5_000);

    await harness.receive(presence(false, 6));
    // The first-reporter update of a second gateway replica arrives late.
    await harness.receive(presence(true, 5));
    expect(source.getStandingSince(npc.id)).toBeUndefined();

    // The snapshot was read before the NPC stopped standing.
    answerFetch({ revision: 4, npcs: [{ npc, since: 5_000 }] });
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(source.getStandingSince(npc.id)).toBeUndefined();

    // An update between the snapshot and the newest one still arrives late.
    await harness.receive(presence(true, 5));
    expect(source.getStandingSince(npc.id)).toBeUndefined();
    release();
  });

  it("shows NPCs reported before it connected and forgets them on disconnect", async () => {
    const { harness, source, release, changed, answerFetch } = await setup();

    answerFetch({ revision: 9, npcs: [{ npc, since: 7_000 }] });
    await vi.waitFor(() => expect(source.getStandingSince(npc.id)).toBe(7_000));

    harness.realtime.disconnect();
    expect(source.getStandingSince(npc.id)).toBeUndefined();
    expect(changed).toHaveBeenCalledTimes(2);
    release();
  });
});
