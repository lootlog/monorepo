import { describe, expect, it } from "bun:test";
import { eq } from "drizzle-orm";
import { Effect } from "effect";
import { eventHeroKillTable } from "#src/database/drizzle/event.schema";
import {
  context,
  fixture,
  hiddenId,
  orderedIds,
  time,
  uuid,
} from "./event-kill-history.fixtures.js";

describe("kill history pagination", () => {
  it("visits and numbers every scoped kill once despite unordered UUIDs and equal timestamps", async () => {
    const f = await fixture();

    try {
      for (const query of [
        {},
        { heroId: "low" },
        { memberId: 1 },
        { memberId: 1, heroId: "low" },
      ]) {
        const expected: Array<[string, number]> =
          "memberId" in query
            ? [
                [orderedIds[0], 5],
                [orderedIds[2], 3],
                [orderedIds[4], 1],
              ]
            : orderedIds.map((id, index): [string, number] => [id, 5 - index]);

        const actual: Array<[string, number]> = [];
        let cursor: string | undefined;

        do {
          const page = await f.run(
            f.history.list(context(), { ...query, limit: 2, cursor }),
          );

          actual.push(
            ...page.items.map((kill): [string, number] => [
              kill.id,
              kill.killNumber,
            ]),
          );
          cursor = page.nextCursor ?? undefined;
        } while (cursor !== undefined && actual.length <= 20);

        expect(actual).toEqual(expected);
      }

      const first = await f.run(f.history.list(context(), { limit: 1 }));
      expect(first.items[0]).toMatchObject({
        id: orderedIds[0],
        participantCount: 2,
      });

      const member = await f.run(
        f.history.list(context(), { memberId: 1, limit: 1 }),
      );

      expect(member).toMatchObject({
        kind: "member",
        member: { id: 1 },
        items: [
          { memberPoint: { points: 7.25, trackingDurationSeconds: 240 } },
        ],
      });
    } finally {
      await f.dispose();
    }
  });

  it("applies current hero visibility before reading cached pages", async () => {
    const f = await fixture();

    try {
      const broad = await f.run(f.history.list(context(500), { limit: 1 }));
      expect(broad.items.map((kill) => kill.id)).toEqual([hiddenId]);
      const narrow = await f.run(f.history.list(context(), { limit: 1 }));
      expect(narrow.items.map((kill) => kill.id)).toEqual([orderedIds[0]]);

      const continuation = await f.run(
        f.history.list(context(), {
          cursor: broad.nextCursor ?? undefined,
          limit: 20,
        }),
      );

      expect(continuation.items.map((kill) => kill.id)).toEqual([
        ...orderedIds,
      ]);
      const none = await f.run(f.history.list(context(20), {}));
      expect(none).toMatchObject({ items: [], nextCursor: null });

      await expect(
        f.run(f.history.list(context(), { heroId: "high" })),
      ).rejects.toThrow("Hero not found");
      await expect(
        f.run(f.history.list(context(), { memberId: 3 })),
      ).rejects.toThrow("Member not found");
      await expect(
        f.run(f.history.list({ ...context(), guildId: "guild-2" }, {})),
      ).rejects.toThrow("Event not found");
    } finally {
      await f.dispose();
    }
  });

  it("continues after a deleted boundary and ignores subsequently inserted newer kills", async () => {
    const f = await fixture();

    try {
      const first = await f.run(f.history.list(context(), { limit: 2 }));
      await f.run(
        f.database
          .delete(eventHeroKillTable)
          .where(eq(eventHeroKillTable.id, orderedIds[1])),
      );
      await f.run(
        f.database.insert(eventHeroKillTable).values({
          id: uuid("aa"),
          heroNpcId: "low",
          killedAt: time("14:00"),
          minSpawnTimeAtKill: time("13:00"),
          maxSpawnTimeAtKill: time("15:00"),
        }),
      );
      await Effect.runPromise(
        f.readCache.invalidateEvent("guild-1", "event-1"),
      );

      const next = await f.run(
        f.history.list(context(), {
          limit: 20,
          cursor: first.nextCursor ?? undefined,
        }),
      );

      expect(next.items.map((kill) => kill.id)).toEqual(orderedIds.slice(2));
      expect(next.nextCursor).toBeNull();
    } finally {
      await f.dispose();
    }
  });

  it("rejects malformed or differently scoped cursors instead of restarting pagination", async () => {
    const f = await fixture();

    try {
      const first = await f.run(f.history.list(context(), { limit: 1 }));

      for (const query of [
        { cursor: "not-a-cursor" },
        { cursor: orderedIds[0] },
        { cursor: first.nextCursor ?? undefined, heroId: "low" },
        { cursor: first.nextCursor ?? undefined, memberId: 1 },
      ]) {
        await expect(f.run(f.history.list(context(), query))).rejects.toThrow();
      }

      if (first.nextCursor === null) throw new Error("Expected continuation");

      const payload = Buffer.from(first.nextCursor, "base64url").toString(
        "utf8",
      );

      for (const killedAt of [
        "0000-01-01T00:00:00.000Z",
        "2026-02-30T12:00:00.000Z",
      ]) {
        const cursor = Buffer.from(
          payload.replace(
            /"killedAt":"[^"]+"/,
            `"killedAt":${JSON.stringify(killedAt)}`,
          ),
        ).toString("base64url");

        await expect(
          f.run(f.history.list(context(), { cursor })),
        ).rejects.toThrow("INVALID_CURSOR");
      }

      await expect(
        f.run(
          f.history.list(
            { ...context(), eventId: "event-2" },
            { cursor: first.nextCursor ?? undefined },
          ),
        ),
      ).rejects.toThrow("INVALID_CURSOR");
    } finally {
      await f.dispose();
    }
  });
});
