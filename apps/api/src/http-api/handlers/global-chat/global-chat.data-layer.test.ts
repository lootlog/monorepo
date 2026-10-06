import { afterEach, describe, expect, it } from "bun:test";
import { Effect } from "effect";
import type { GlobalChatMessage } from "@lootlog/schema/chat";
import { ApiDatabase } from "#src/database/drizzle/database";
import { guildTable, memberTable } from "#src/database/drizzle/schema";
import { createDatabaseBoundary } from "../../../../test/database-fixtures.js";
import {
  createGuildFixture,
  createMemberFixture,
} from "../../../../test/organization-fixtures.js";
import {
  makeGlobalChatOperations,
  type GlobalChatStore,
} from "./global-chat.data-layer.js";

const boundaries: Array<Awaited<ReturnType<typeof createDatabaseBoundary>>> =
  [];

afterEach(async () => {
  await Promise.all(boundaries.splice(0).map((boundary) => boundary.dispose()));
});

const author = { userId: "author-user", discordId: "author" };

const reader = { userId: "reader-user", discordId: "reader" };

const outsider = { userId: "outsider-user", discordId: "outsider" };

const setup = async () => {
  const boundary = await createDatabaseBoundary();
  boundaries.push(boundary);
  const database = boundary.database;

  await boundary.run(
    database
      .insert(guildTable)
      .values([
        createGuildFixture({ id: "first", ownerId: "owner" }),
        createGuildFixture({ id: "second", ownerId: "owner" }),
        createGuildFixture({ id: "inactive", ownerId: "owner", active: false }),
      ]),
  );
  await boundary.run(
    database.insert(memberTable).values([
      createMemberFixture({
        id: 1,
        guildId: "first",
        userId: author.discordId,
        globalUserId: author.userId,
        name: "First server nickname",
        discordDisplayName: "Author",
        lastDiscordSyncAt: new Date(1),
      }),
      createMemberFixture({
        id: 2,
        guildId: "second",
        userId: author.discordId,
        globalUserId: author.userId,
        name: "Second server nickname",
        lastDiscordSyncAt: new Date(2),
      }),
      createMemberFixture({
        id: 3,
        guildId: "second",
        userId: reader.discordId,
        globalUserId: reader.userId,
        name: "Reader nickname",
      }),
      createMemberFixture({
        id: 4,
        guildId: "first",
        userId: outsider.discordId,
        globalUserId: outsider.userId,
        active: false,
      }),
      createMemberFixture({
        id: 5,
        guildId: "inactive",
        userId: outsider.discordId,
        globalUserId: outsider.userId,
      }),
    ]),
  );

  const entries: string[] = [];
  const cooling = new Set<string>();
  const published: GlobalChatMessage[] = [];

  const store: GlobalChatStore = {
    append: (value) => Effect.sync(() => void entries.push(value)),
    page: (before, count) =>
      Effect.sync(() =>
        entries
          .flatMap((value, index) =>
            before === undefined || index + 1 < before
              ? [{ value, position: index + 1 }]
              : [],
          )
          .toReversed()
          .slice(0, count),
      ),
    acquireSendSlot: (userId) =>
      Effect.sync(() => {
        if (cooling.has(userId)) return false;
        cooling.add(userId);

        return true;
      }),
  };

  const operations = await Effect.runPromise(
    makeGlobalChatOperations(store, {
      publish: (message) => Effect.sync(() => void published.push(message)),
    }).pipe(Effect.provideService(ApiDatabase, database)),
  );

  return { operations, published, cooling };
};

describe("global chat", () => {
  it("rejects a User without an active membership in an active Organization", async () => {
    const { operations } = await setup();

    const read = await Effect.runPromise(
      Effect.flip(operations.getMessages(outsider, undefined)),
    );

    const send = await Effect.runPromise(
      Effect.flip(operations.sendMessage(outsider, { message: "Hi" })),
    );

    expect(read._tag).toBe("GlobalChatAccessDenied");
    expect(send._tag).toBe("GlobalChatAccessDenied");
  });

  it("names the sender by Discord display name and broadcasts no identifier", async () => {
    const { operations, published } = await setup();

    const sent = await Effect.runPromise(
      operations.sendMessage(author, { message: "Hello everyone" }),
    );

    expect(sent).toMatchObject({ displayName: "Author", isOwn: true });
    expect(published).toEqual([
      {
        id: sent.id,
        displayName: "Author",
        message: "Hello everyone",
        timestamp: sent.timestamp,
      },
    ]);
  });

  it("falls back to the server nickname until member sync stores a display name", async () => {
    const { operations } = await setup();

    const sent = await Effect.runPromise(
      operations.sendMessage(reader, { message: "Hi" }),
    );

    expect(sent.displayName).toBe("Reader nickname");
  });

  it("marks only the caller's own messages as own", async () => {
    const { operations } = await setup();
    await Effect.runPromise(
      operations.sendMessage(author, { message: "Mine" }),
    );

    const forAuthor = await Effect.runPromise(
      operations.getMessages(author, undefined),
    );

    const forReader = await Effect.runPromise(
      operations.getMessages(reader, undefined),
    );

    expect(forAuthor.messages.map(({ isOwn }) => isOwn)).toEqual([true]);
    expect(forReader.messages.map(({ isOwn }) => isOwn)).toEqual([false]);
  });

  it("rejects a send within the cooldown without storing or broadcasting it", async () => {
    const { operations, published } = await setup();
    await Effect.runPromise(operations.sendMessage(author, { message: "One" }));

    const second = await Effect.runPromise(
      Effect.flip(operations.sendMessage(author, { message: "Two" })),
    );

    const page = await Effect.runPromise(
      operations.getMessages(reader, undefined),
    );

    expect(second._tag).toBe("GlobalChatRateLimited");
    expect(page.messages.map(({ message }) => message)).toEqual(["One"]);
    expect(published).toHaveLength(1);
  });

  it("pages from the newest message back with a cursor", async () => {
    const { operations, cooling } = await setup();

    for (let index = 1; index <= 105; index += 1) {
      cooling.clear();
      await Effect.runPromise(
        operations.sendMessage(author, { message: `Message ${index}` }),
      );
    }

    const newest = await Effect.runPromise(
      operations.getMessages(reader, undefined),
    );

    const older = await Effect.runPromise(
      operations.getMessages(reader, Number(newest.nextCursor)),
    );

    expect(newest.messages).toHaveLength(100);
    expect(newest.messages.at(0)?.message).toBe("Message 6");
    expect(newest.messages.at(-1)?.message).toBe("Message 105");
    expect(older.messages.map(({ message }) => message)).toEqual([
      "Message 1",
      "Message 2",
      "Message 3",
      "Message 4",
      "Message 5",
    ]);
    expect(older.nextCursor).toBeNull();
  });
});
