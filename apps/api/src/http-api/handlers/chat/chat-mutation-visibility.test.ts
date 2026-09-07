import { describe, expect, it } from "bun:test";
import { Effect } from "effect";
import { Permission } from "@lootlog/schema/permissions";
import { ApiDatabase } from "#src/database/drizzle/database";
import type { roleTable } from "#src/database/drizzle/schema";
import { PermissionDeniedError } from "#src/shared/http/http-errors";
import { ChatOperationError } from "./chat.handlers.js";
import { makeChatOperations, type ChatRedis } from "./chat.data-layer.js";

const message = {
  id: "message",
  guildId: "organization",
  senderId: "author",
  timestamp: new Date(0).toISOString(),
  message: "Original message",
  type: "NPC",
  characterData: {
    nick: "Character",
    id: 1,
    acc: 2,
    lvl: 250,
    prof: "w",
    icon: "icon.gif",
  },
  npc: {
    id: 105,
    name: "Hidden NPC",
    lvl: 105,
    wt: 20,
    type: 0,
    prof: "w",
    location: "Map",
    icon: "npc.gif",
  },
};

const setup = async (permissions: Permission[], levelFrom = 200) => {
  const roles: Array<typeof roleTable.$inferSelect> = [
    {
      id: "role",
      guildId: "organization",
      name: "Role",
      color: null,
      position: null,
      permissions,
      lvlRangeFrom: levelFrom,
      lvlRangeTo: 500,
      createdAt: new Date(0),
      updatedAt: new Date(0),
    },
  ];
  // PostgreSQL is the external boundary; keep the real chat operations, Redis
  // mutations, visibility policy and emitted facts under test.
  const query = (rows: unknown[]) => {
    const result = Object.assign(Effect.succeed(rows), {
      from: () => result,
      where: () => result,
      innerJoin: () => result,
      limit: () => result,
    });
    return result;
  };
  const database = {
    select: (selection?: unknown) =>
      query(
        selection
          ? roles.map((role) => ({ role }))
          : [{ id: "organization", ownerId: "owner", active: true }],
      ),
  } as unknown as typeof ApiDatabase.Service;
  const records = [JSON.stringify(message)];
  const published: unknown[] = [];
  const redis: ChatRedis = {
    lrange: () => Effect.sync(() => [...records]),
    lset: (_key, index, value) =>
      Effect.sync(() => {
        records[index] = value;
      }),
    lrem: (_key, _count, value) =>
      Effect.sync(() => {
        const index = records.indexOf(value);
        if (index >= 0) records.splice(index, 1);
      }),
    del: () =>
      Effect.sync(() => {
        records.length = 0;
      }),
    rpush: (_key, value) =>
      Effect.sync(() => {
        records.push(value);
      }),
    ltrim: () => Effect.void,
  };
  const operations = await Effect.runPromise(
    makeChatOperations(redis, {
      publish: (_key, payload) =>
        Effect.sync(() => {
          published.push(payload);
        }),
    }).pipe(Effect.provideService(ApiDatabase, database)),
  );
  return { operations: operations.service, records, published };
};

describe("chat mutation source visibility", () => {
  it.each(["edit", "delete"] as const)(
    "rejects %s after the author loses the source level",
    async (action) => {
      const fixture = await setup([
        Permission.LOOTLOG_CHAT_READ,
        Permission.LOOTLOG_CHAT_WRITE,
      ]);
      const operation =
        action === "edit"
          ? fixture.operations.updateMessage(
              "author",
              "organization",
              "message",
              "Changed",
            )
          : fixture.operations.deleteMessage(
              "author",
              "organization",
              "message",
            );
      const failure = await Effect.runPromise(operation.pipe(Effect.flip));
      expect(failure).toBeInstanceOf(ChatOperationError);
      expect(failure.cause).toBeInstanceOf(PermissionDeniedError);
      expect(fixture.records).toEqual([JSON.stringify(message)]);
      expect(fixture.published).toEqual([]);
    },
  );

  it("retains author mutations for a visible source and broadcasts their result", async () => {
    const fixture = await setup(
      [Permission.LOOTLOG_CHAT_READ, Permission.LOOTLOG_CHAT_WRITE],
      0,
    );
    await Effect.runPromise(
      fixture.operations.updateMessage(
        "author",
        "organization",
        "message",
        "Changed",
      ),
    );
    expect(JSON.parse(fixture.records[0] ?? "null").message).toBe("Changed");
    await Effect.runPromise(
      fixture.operations.deleteMessage("author", "organization", "message"),
    );
    expect(fixture.records).toEqual([]);
    expect(fixture.published).toHaveLength(2);
  });

  it("allows administrators to delete messages outside their role range", async () => {
    const fixture = await setup([Permission.ADMIN]);
    await Effect.runPromise(
      fixture.operations.deleteMessage(
        "administrator",
        "organization",
        "message",
      ),
    );
    expect(fixture.records).toEqual([]);
    expect(fixture.published).toHaveLength(1);
  });
});
