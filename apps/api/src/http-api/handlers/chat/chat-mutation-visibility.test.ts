import { createDatabaseBoundary } from "../../../../test/database-fixtures.js";
import {
  createGuildFixture,
  createMemberFixture,
} from "../../../../test/organization-fixtures.js";
import { afterEach, describe, expect, it } from "bun:test";
import { Effect, Layer } from "effect";
import { BunHttpServer } from "@effect/platform-bun";
import { apiKeyEndpointPolicyLayer } from "@lootlog/schema/api-key-http";
import { HttpRouter } from "effect/unstable/http";
import { HttpApi, HttpApiBuilder } from "effect/unstable/httpapi";
import { ChatGroup } from "../../contracts/chat/api.js";
import { BearerSecurityMiddleware } from "../../contracts/shared.js";
import { ForwardAuthIdentity } from "#src/runtime/auth/forward-auth-identity";
import { Permission } from "@lootlog/schema/permissions";
import { ApiDatabase } from "#src/database/drizzle/database";
import {
  guildTable,
  memberTable,
  memberToRoleTable,
  roleTable,
} from "#src/database/drizzle/schema";
import { PermissionDeniedError } from "#src/shared/http/http-errors";
import {
  ChatOperationError,
  ChatHandlers,
  ChatData,
  ChatAuthorization,
} from "./chat.handlers.js";
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

const boundaries: Array<Awaited<ReturnType<typeof createDatabaseBoundary>>> =
  [];

afterEach(async () => {
  await Promise.all(boundaries.splice(0).map((boundary) => boundary.dispose()));
});

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

  const boundary = await createDatabaseBoundary();
  boundaries.push(boundary);
  const database = boundary.database;
  await boundary.run(
    database
      .insert(guildTable)
      .values(createGuildFixture({ id: "organization", ownerId: "owner" })),
  );
  await boundary.run(
    database.insert(memberTable).values([
      createMemberFixture({
        id: 1,
        guildId: "organization",
        userId: "author",
        globalUserId: "author-user",
      }),
      createMemberFixture({
        id: 2,
        guildId: "organization",
        userId: "administrator",
        globalUserId: "admin-user",
      }),
    ]),
  );
  await boundary.run(database.insert(roleTable).values(roles));
  await boundary.run(
    database.insert(memberToRoleTable).values([
      { A: 1, B: "role" },
      { A: 2, B: "role" },
    ]),
  );
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

  return {
    operations: operations.service,
    endPartyGatheringMessages: operations.endPartyGatheringMessages,
    records,
    published,
  };
};

describe("chat mutation source visibility", () => {
  it("rejects the removed PATCH endpoint without changing stored messages", async () => {
    const fixture = await setup(
      [Permission.LOOTLOG_CHAT_READ, Permission.LOOTLOG_CHAT_WRITE],
      0,
    );

    const caller = { userId: "author-user", discordId: "author" };

    const services = Layer.mergeAll(
      Layer.succeed(ChatData, fixture.operations),
      Layer.succeed(ChatAuthorization, {
        requireGuild: () =>
          Effect.succeed({
            ...caller,
            guildId: "organization",
            permissions: [
              Permission.LOOTLOG_CHAT_READ,
              Permission.LOOTLOG_CHAT_WRITE,
            ],
          }),
      }),
    );

    const boundary = HttpRouter.toWebHandler(
      HttpApiBuilder.layer(HttpApi.make("LootlogApi").add(ChatGroup)).pipe(
        Layer.provide(ChatHandlers),
        Layer.provide(
          Layer.succeed(BearerSecurityMiddleware, {
            bearer: (effect) =>
              Effect.provideService(effect, ForwardAuthIdentity, caller),
          }),
        ),
        HttpRouter.provideRequest(services),
        Layer.provide(BunHttpServer.layerHttpServices),
        Layer.provide(apiKeyEndpointPolicyLayer("main")),
      ),
      { disableLogger: true },
    );

    try {
      const response = await boundary.handler(
        new Request(
          "http://api.test/guilds/organization/chat-messages/message",
          {
            method: "PATCH",
            headers: {
              authorization: "Bearer test",
              "content-type": "application/json",
            },
            body: JSON.stringify({ message: "Changed" }),
          },
        ),
      );

      expect(response.status).toBe(404);
      expect(fixture.records).toEqual([JSON.stringify(message)]);
      expect(fixture.published).toEqual([]);
    } finally {
      await boundary.dispose();
    }
  });

  it("rejects deletion after the author loses the source level", async () => {
    const fixture = await setup([
      Permission.LOOTLOG_CHAT_READ,
      Permission.LOOTLOG_CHAT_WRITE,
    ]);

    const operation = fixture.operations.deleteMessage(
      "author",
      "organization",
      "message",
    );

    const failure = await Effect.runPromise(operation.pipe(Effect.flip));
    expect(failure).toBeInstanceOf(ChatOperationError);
    expect(failure.cause).toBeInstanceOf(PermissionDeniedError);
    expect(fixture.records).toEqual([JSON.stringify(message)]);
    expect(fixture.published).toEqual([]);
  });

  it("retains author deletion for a visible source and broadcasts their result", async () => {
    const fixture = await setup(
      [Permission.LOOTLOG_CHAT_READ, Permission.LOOTLOG_CHAT_WRITE],
      0,
    );

    await Effect.runPromise(
      fixture.operations.deleteMessage("author", "organization", "message"),
    );
    expect(fixture.records).toEqual([]);
    expect(fixture.published).toHaveLength(1);
  });

  it("preserves system updates when a party gathering ends", async () => {
    const fixture = await setup([Permission.LOOTLOG_CHAT_READ]);
    fixture.records[0] = JSON.stringify({
      ...message,
      type: "PARTY_GATHERING",
      partyGathering: {
        notificationId: "party",
        discordId: "author",
        world: "world",
      },
    });
    await Effect.runPromise(
      fixture.endPartyGatheringMessages("party", ["organization"]),
    );
    const stored = JSON.parse(fixture.records[0] ?? "null");
    expect(stored.message).toBe("Character zakończył zbieranie grupy");
    expect(stored.partyGathering).toBeUndefined();
    expect(fixture.published).toEqual([
      {
        guildId: "organization",
        messageId: "message",
        message: stored.message,
        routing: { tier: "base", npcLevel: message.npc.lvl },
      },
    ]);
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
