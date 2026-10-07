import { afterEach, describe, expect, it } from "bun:test";
import { Effect, Schema } from "effect";
import type {
  GlobalChatChannelUpdate,
  GlobalChatMessage,
} from "@lootlog/schema/chat";
import { ApiDatabase } from "#src/database/drizzle/database";
import {
  globalChatMuteTable,
  guildTable,
  memberTable,
  timerTable,
} from "#src/database/drizzle/schema";
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

const admin = { userId: "admin-user", discordId: "admin" };

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
        id: 6,
        guildId: "first",
        userId: admin.discordId,
        globalUserId: admin.userId,
        name: "Admin nickname",
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

  const now = new Date();

  await boundary.run(
    database.insert(timerTable).values(
      ["gordion", "tarhuna"].map((world, index) => ({
        guildId: "first",
        world,
        npcId: index + 1,
        timerKey: `timer-${index}`,
        createdById: 1,
        minSpawnTime: now,
        maxSpawnTime: now,
        updatedAt: now,
        npc: { name: "Npc", icon: "npc.png", lvl: 1 },
      })),
    ),
  );

  const channels = new Map<string, string[]>();
  const pinned = new Map<string, string>();
  const cooling = new Set<string>();
  const published: GlobalChatMessage[] = [];
  const updates: GlobalChatChannelUpdate[] = [];

  const entries = (world: string | undefined) => {
    const key = world ?? "";
    const existing = channels.get(key);

    if (existing) return existing;
    const created: string[] = [];
    channels.set(key, created);

    return created;
  };

  const idOf = (value: string) => decodeId(value).id;

  const store: GlobalChatStore = {
    append: (world, value) =>
      Effect.sync(() => void entries(world).push(value)),
    page: (world, before, count) =>
      Effect.sync(() =>
        entries(world)
          .flatMap((value, index) =>
            value !== "" && (before === undefined || index + 1 < before)
              ? [{ value, position: index + 1 }]
              : [],
          )
          .toReversed()
          .slice(0, count),
      ),
    find: (world, id) =>
      Effect.sync(() =>
        entries(world).find((value) => value !== "" && idOf(value) === id),
      ),
    remove: (world, id) =>
      Effect.sync(() => {
        const kept = entries(world);

        const index = kept.findIndex(
          (value) => value !== "" && idOf(value) === id,
        );

        // Keeps positions stable, like the scored sorted set.
        if (index !== -1) kept[index] = "";

        return index !== -1;
      }),
    getPinned: (world) => Effect.sync(() => pinned.get(world ?? "")),
    setPinned: (world, value) =>
      Effect.sync(() => {
        if (value === undefined) pinned.delete(world ?? "");
        else pinned.set(world ?? "", value);
      }),
    acquireSendSlot: (userId) =>
      Effect.sync(() => {
        if (cooling.has(userId)) return false;
        cooling.add(userId);

        return true;
      }),
  };

  const operations = await Effect.runPromise(
    makeGlobalChatOperations(
      store,
      {
        publish: (message) => Effect.sync(() => void published.push(message)),
        publishChannelUpdate: (update) =>
          Effect.sync(() => void updates.push(update)),
      },
      [admin.userId],
    ).pipe(Effect.provideService(ApiDatabase, database)),
  );

  return { operations, published, updates, cooling, boundary, database };
};

const decodeId = Schema.decodeUnknownSync(
  Schema.fromJsonString(Schema.Struct({ id: Schema.String })),
);

const run = <A, E>(effect: Effect.Effect<A, E>) => Effect.runPromise(effect);

const fail = <A, E>(effect: Effect.Effect<A, E>) =>
  Effect.runPromise(Effect.flip(effect));

describe("global chat", () => {
  it("rejects a User without an active membership in an active Organization", async () => {
    const { operations } = await setup();

    const read = await Effect.runPromise(
      Effect.flip(operations.getMessages(outsider, undefined, undefined)),
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
        isAdmin: false,
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
      operations.getMessages(author, undefined, undefined),
    );

    const forReader = await Effect.runPromise(
      operations.getMessages(reader, undefined, undefined),
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
      operations.getMessages(reader, undefined, undefined),
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
      operations.getMessages(reader, undefined, undefined),
    );

    const older = await Effect.runPromise(
      operations.getMessages(reader, undefined, Number(newest.nextCursor)),
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

  it("keeps each world's channel apart from the others and the shared one", async () => {
    const { operations, published } = await setup();

    const sent = await run(
      operations.sendMessage(author, {
        message: "Gordion only",
        world: "gordion",
      }),
    );

    const read = (world: string | undefined) =>
      run(operations.getMessages(reader, world, undefined)).then(
        ({ messages }) => messages.map(({ message }) => message),
      );

    expect(await read("gordion")).toEqual(["Gordion only"]);
    expect(await read("tarhuna")).toEqual([]);
    expect(await read(undefined)).toEqual([]);
    expect(published).toEqual([
      expect.objectContaining({ id: sent.id, world: "gordion" }),
    ]);
  });

  it("refuses a world no Organization has recorded a timer on", async () => {
    const { operations, published } = await setup();

    const read = await fail(
      operations.getMessages(reader, "nowhere", undefined),
    );

    const send = await fail(
      operations.sendMessage(author, { message: "Hi", world: "nowhere" }),
    );

    expect(read._tag).toBe("GlobalChatNotFound");
    expect(send._tag).toBe("GlobalChatNotFound");
    expect(published).toHaveLength(0);
  });

  it("tags the sender's known world only in the shared channel", async () => {
    const { operations, cooling } = await setup();

    const send = async (payload: {
      message: string;
      world?: string;
      originWorld?: string;
    }) => {
      cooling.clear();

      return run(operations.sendMessage(author, payload));
    };

    const shared = await send({
      message: "From Gordion",
      originWorld: "gordion",
    });

    const unknown = await send({
      message: "From nowhere",
      originWorld: "nowhere",
    });

    const inWorld = await send({
      message: "In Tarhuna",
      world: "tarhuna",
      originWorld: "gordion",
    });

    expect(shared.originWorld).toBe("gordion");
    expect(unknown.originWorld).toBeUndefined();
    expect(inWorld.originWorld).toBeUndefined();
  });

  it("sends an admin's message to every channel and refuses it from others", async () => {
    const { operations, published } = await setup();

    const refused = await fail(
      operations.sendMessage(author, { message: "Everyone", allWorlds: true }),
    );

    expect(refused._tag).toBe("GlobalChatAccessDenied");
    expect(published).toHaveLength(0);

    const sent = await run(
      operations.sendMessage(admin, {
        message: "Maintenance tonight",
        world: "tarhuna",
        originWorld: "gordion",
        allWorlds: true,
      }),
    );

    const read = (world: string | undefined) =>
      run(operations.getMessages(reader, world, undefined)).then(
        ({ messages }) => messages,
      );

    const [shared] = await read(undefined);
    const [gordion] = await read("gordion");
    const [tarhuna] = await read("tarhuna");

    expect(sent).toMatchObject({ world: "tarhuna", isAdmin: true });
    expect(tarhuna?.id).toBe(sent.id);
    expect(shared?.message).toBe("Maintenance tonight");
    expect(shared?.originWorld).toBeUndefined();
    expect(gordion?.message).toBe("Maintenance tonight");
    expect(new Set([shared?.id, gordion?.id, tarhuna?.id]).size).toBe(3);
    expect(published.map(({ world }) => world).toSorted()).toEqual([
      "gordion",
      "tarhuna",
      undefined,
    ]);

    // Each channel moderates its own copy.
    await run(operations.deleteMessage(admin, "gordion", gordion?.id ?? ""));
    expect(await read("gordion")).toEqual([]);
    expect(await read(undefined)).toHaveLength(1);
  });

  it("marks admin messages and tells only admins they may moderate", async () => {
    const { operations } = await setup();
    await run(operations.sendMessage(admin, { message: "Rules" }));
    await run(operations.sendMessage(author, { message: "Hi" }));

    const forReader = await run(
      operations.getMessages(reader, undefined, undefined),
    );

    const forAdmin = await run(
      operations.getMessages(admin, undefined, undefined),
    );

    expect(forReader.messages.map(({ isAdmin }) => isAdmin)).toEqual([
      true,
      false,
    ]);
    expect(forReader.viewer.isAdmin).toBe(false);
    expect(forAdmin.viewer.isAdmin).toBe(true);
  });

  it("lets only admins moderate", async () => {
    const { operations, updates } = await setup();
    const sent = await run(operations.sendMessage(author, { message: "Hi" }));

    const attempts = await Promise.all([
      fail(operations.deleteMessage(reader, undefined, sent.id)),
      fail(operations.pinMessage(reader, { messageId: sent.id })),
      fail(operations.unpinMessage(reader, undefined)),
      fail(operations.getMutes(reader)),
      fail(
        operations.muteSender(reader, {
          messageId: sent.id,
          durationMinutes: 5,
        }),
      ),
      fail(operations.unmuteMessageSender(reader, undefined, sent.id)),
    ]);

    const page = await run(
      operations.getMessages(reader, undefined, undefined),
    );

    expect(attempts.map(({ _tag }) => _tag)).toEqual(
      Array.from({ length: 6 }, () => "GlobalChatAccessDenied"),
    );
    expect(page.messages).toHaveLength(1);
    expect(page.pinned).toBeNull();
    expect(updates).toHaveLength(0);
  });

  it("pins a message above its channel and unpins it when deleted", async () => {
    const { operations, updates } = await setup();

    const sent = await run(
      operations.sendMessage(author, { message: "Pin me", world: "gordion" }),
    );

    await run(
      operations.pinMessage(admin, { world: "gordion", messageId: sent.id }),
    );

    const pinnedPage = await run(
      operations.getMessages(reader, "gordion", undefined),
    );

    const sharedPage = await run(
      operations.getMessages(reader, undefined, undefined),
    );

    await run(operations.deleteMessage(admin, "gordion", sent.id));

    const afterDelete = await run(
      operations.getMessages(reader, "gordion", undefined),
    );

    expect(pinnedPage.pinned).toMatchObject({ id: sent.id, isOwn: false });
    expect(sharedPage.pinned).toBeNull();
    expect(afterDelete.messages).toEqual([]);
    expect(afterDelete.pinned).toBeNull();
    expect(updates).toEqual([
      expect.objectContaining({ type: "pinned", world: "gordion" }),
      { type: "pinned", world: "gordion", message: null },
      { type: "deleted", world: "gordion", id: sent.id },
    ]);
    expect(
      (await fail(operations.deleteMessage(admin, "gordion", sent.id)))._tag,
    ).toBe("GlobalChatNotFound");
  });

  it("stops a muted sender in every channel until the mute is lifted", async () => {
    const { operations, cooling } = await setup();
    const sent = await run(operations.sendMessage(author, { message: "Spam" }));

    const mute = await run(
      operations.muteSender(admin, { messageId: sent.id, durationMinutes: 60 }),
    );

    cooling.clear();

    const blocked = await fail(
      operations.sendMessage(author, { message: "More", world: "gordion" }),
    );

    const viewer = (
      await run(operations.getMessages(author, undefined, undefined))
    ).viewer;

    const listed = await run(operations.getMutes(admin));

    await run(operations.unmuteMessageSender(admin, undefined, sent.id));

    const notMuted = await Promise.all([
      fail(operations.unmuteMessageSender(admin, undefined, sent.id)),
      fail(operations.unmuteSender(admin, mute.id)),
    ]);

    const resumed = await run(
      operations.sendMessage(author, { message: "Sorry", world: "gordion" }),
    );

    expect(blocked._tag).toBe("GlobalChatAccessDenied");
    expect(viewer).toEqual({
      isAdmin: false,
      muted: true,
      mutedUntil: mute.mutedUntil,
    });
    expect(listed.mutes).toEqual([mute]);
    // Lifted from the message's menu; neither way finds the mute again.
    expect(notMuted.map(({ _tag }) => _tag)).toEqual([
      "GlobalChatNotFound",
      "GlobalChatNotFound",
    ]);
    expect(resumed.message).toBe("Sorry");
  });

  it("replaces an earlier mute and ignores expired ones", async () => {
    const { operations, boundary, database } = await setup();
    const sent = await run(operations.sendMessage(author, { message: "Spam" }));

    await run(
      operations.muteSender(admin, { messageId: sent.id, durationMinutes: 5 }),
    );

    const lasting = await run(
      operations.muteSender(admin, {
        messageId: sent.id,
        durationMinutes: null,
      }),
    );

    const listed = await run(operations.getMutes(admin));

    await boundary.run(
      database
        .update(globalChatMuteTable)
        .set({ mutedUntil: new Date(Date.now() - 1_000) }),
    );

    const afterExpiry = await run(operations.getMutes(admin));

    const viewer = (
      await run(operations.getMessages(author, undefined, undefined))
    ).viewer;

    expect(listed.mutes).toEqual([lasting]);
    expect(lasting.mutedUntil).toBeNull();
    expect(afterExpiry.mutes).toEqual([]);
    expect(viewer.muted).toBe(false);
  });
});
