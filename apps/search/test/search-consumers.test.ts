import { expect, mock, test } from "bun:test";
import { RabbitMessaging, type RabbitChannel } from "@lootlog/messaging";
import { Effect, Layer, ManagedRuntime } from "effect";
import { Meilisearch } from "meilisearch";
import { SearchOperations } from "../src/http-api/search-operations.js";
import { makeItemsModule } from "../src/items/items.service.js";
import { makeNpcsModule } from "../src/npcs/npcs.service.js";
import { makePlayersModule } from "../src/players/players.service.js";
import { SearchConsumers } from "../src/search-application.js";

type Consumer = Parameters<RabbitChannel["consume"]>[1];

type Message = NonNullable<Parameters<Consumer>[0]>;

const player = (id: number) => ({
  id: String(id),
  name: `Player ${id}`,
  lvl: 1,
  prof: "w",
  icon: "p.gif",
  characterId: id,
  accountId: id,
  world: "test",
});

const until = async (condition: () => boolean, timeout = 6000) => {
  const deadline = Date.now() + timeout;

  while (!condition()) {
    if (Date.now() > deadline) throw new Error("Consumer did not settle");
    await Bun.sleep(10);
  }
};

const setup = async () => {
  const consumers = new Map<string, Consumer>();
  const ack = mock((_message: Message) => {});

  const nack = mock(
    (_message: Message, _all?: boolean, _requeue?: boolean) => {},
  );

  const channel: RabbitChannel = {
    ack,
    nack,
    assertExchange: async () => ({ exchange: "default" }),
    assertQueue: async (queue = "test") => ({
      queue,
      messageCount: 0,
      consumerCount: 0,
    }),
    bindQueue: async () => ({}),
    cancel: async (consumerTag) => ({ consumerTag }),
    close: async () => {},
    consume: async (queue, callback) => {
      consumers.set(queue, callback);

      return { consumerTag: queue };
    },
    prefetch: async () => ({}),
    publish: () => true,
    waitForConfirms: async () => {},
  };

  type Document = { uid: string };

  const writes: { index: string; documents: Document[] }[] = [];
  const stored = new Map<string, Map<string, Document>>();

  const tasks = new Map<
    number,
    ReturnType<typeof Promise.withResolvers<{ uid: number; status: string }>>
  >();

  const client = new Meilisearch({
    host: "http://search.invalid",
    httpClient: (input, init) => {
      const url = new URL(String(input));
      const path = url.pathname;
      const index = path.split("/")[2] ?? "unknown";

      if (path.startsWith("/tasks/")) {
        const task = tasks.get(Number(path.split("/").at(-1)));

        if (!task) throw new Error(`Unexpected task ${path}`);

        return task.promise;
      }

      if ((init?.method ?? "GET").toUpperCase() === "GET") {
        const ids = (url.searchParams.get("ids") ?? "").split(",");

        return Promise.resolve({
          results: ids.flatMap((id) => {
            const document = stored.get(index)?.get(id);

            return document ? [document] : [];
          }),
        });
      }

      const uid = writes.length + 1;
      writes.push({
        index,
        documents: JSON.parse(String(init?.body)),
      });
      tasks.set(uid, Promise.withResolvers());

      return Promise.resolve({ taskUid: uid, status: "enqueued" });
    },
  });

  const logger = { info() {}, warn() {}, error() {} };
  const items = makeItemsModule(client, logger);
  const npcs = makeNpcsModule(client, logger);
  const players = makePlayersModule(client, logger);

  const operations = Layer.succeed(
    SearchOperations,
    SearchOperations.of({
      indexItems: items.indexItems,
      indexNpcs: npcs.indexNpcs,
      indexPlayers: players.indexPlayers,
      searchPlayers: () => Effect.die("unused"),
      searchNpcs: () => Effect.die("unused"),
      searchItems: () => Effect.die("unused"),
      searchAll: () => Effect.die("unused"),
    }),
  );

  const runtime = ManagedRuntime.make(
    SearchConsumers.pipe(
      Layer.provide(operations),
      Layer.provide(RabbitMessaging.layerFromChannel(channel)),
    ),
  );

  await runtime.runPromise(Effect.void);
  let deliveryTag = 0;

  const dispatch = (queue: string, documents: unknown[]) => {
    const message: Message = {
      content: Buffer.from(JSON.stringify(documents)),
      fields: {
        consumerTag: queue,
        deliveryTag: ++deliveryTag,
        redelivered: false,
        exchange: "default",
        routingKey: queue,
      },
      properties: {
        contentType: "application/json",
        contentEncoding: undefined,
        headers: {},
        deliveryMode: 2,
        priority: undefined,
        correlationId: undefined,
        replyTo: undefined,
        expiration: undefined,
        messageId: undefined,
        timestamp: undefined,
        type: undefined,
        userId: undefined,
        appId: undefined,
        clusterId: undefined,
      },
    };

    consumers.get(queue)?.(message);

    return message;
  };

  const complete = (uid: number, status = "succeeded") => {
    const write = writes[uid - 1];

    if (status === "succeeded" && write) {
      const documents = stored.get(write.index) ?? new Map<string, Document>();

      for (const document of write.documents)
        documents.set(document.uid, document);
      stored.set(write.index, documents);
    }

    tasks.get(uid)?.resolve({ uid, status });
  };

  return { runtime, ack, nack, dispatch, writes, complete, stored };
};

test("coalesces each index independently and acknowledges only completed Meilisearch tasks", async () => {
  const fixture = await setup();

  try {
    for (const id of [1, 2]) {
      fixture.dispatch("search-players-index", [player(id)]);
      fixture.dispatch("search.items.index", [
        {
          id,
          name: `Item ${id}`,
          icon: "i.gif",
          stat: "",
          lvl: 1,
          rarity: null,
          type: null,
          world: "test",
        },
      ]);
      fixture.dispatch("search-npcs-index", [
        {
          id,
          name: `Npc ${id}`,
          icon: "n.gif",
          prof: null,
          lvl: 1,
          wt: 1,
          type: "COMMON",
          margonemType: 0,
          world: "test",
        },
      ]);
    }

    await until(() => fixture.writes.length === 3);
    expect(fixture.writes.map(({ index }) => index).sort()).toEqual([
      "items",
      "npcs",
      "players",
    ]);
    expect(fixture.writes.map(({ documents }) => documents.length)).toEqual([
      2, 2, 2,
    ]);
    expect(fixture.ack).not.toHaveBeenCalled();
    fixture.complete(1);
    fixture.complete(2);
    fixture.complete(3);
    await until(() => fixture.ack.mock.calls.length === 6);
    expect(fixture.nack).not.toHaveBeenCalled();
  } finally {
    await fixture.runtime.dispose();
  }
}, 10000);

test("retries the ordered batch without requeueing or letting newer batches overtake it", async () => {
  const fixture = await setup();

  try {
    const first = fixture.dispatch("search-players-index", [
      { ...player(1), lvl: 300 },
    ]);

    const second = fixture.dispatch("search-players-index", [
      { ...player(1), lvl: 302 },
    ]);

    await until(() => fixture.writes.length === 1);
    expect(fixture.writes[0]?.documents).toEqual([
      expect.objectContaining({ lvl: 302 }),
    ]);
    fixture.complete(1, "failed");

    const newest = fixture.dispatch("search-players-index", [
      { ...player(1), lvl: 303 },
    ]);

    await until(() => fixture.writes.length === 2);
    expect(fixture.nack).not.toHaveBeenCalled();
    expect(fixture.ack).not.toHaveBeenCalled();
    expect(fixture.writes[1]).toEqual(fixture.writes[0]);
    fixture.complete(2);

    await until(() => fixture.writes.length === 3);
    expect(fixture.ack).toHaveBeenCalledWith(first);
    expect(fixture.ack).toHaveBeenCalledWith(second);
    expect(fixture.ack).not.toHaveBeenCalledWith(newest);
    fixture.complete(3);
    await until(() => fixture.ack.mock.calls.length === 3);
    expect([...(fixture.stored.get("players")?.values() ?? [])]).toEqual([
      expect.objectContaining({ lvl: 303 }),
    ]);
    expect(fixture.nack).not.toHaveBeenCalled();
  } finally {
    await fixture.runtime.dispose();
  }
}, 15000);

test("shutdown requeues buffered deliveries before the flush deadline", async () => {
  const fixture = await setup();
  const message = fixture.dispatch("search-players-index", [player(1)]);
  await Bun.sleep(10);
  await fixture.runtime.dispose();
  expect(fixture.writes).toEqual([]);
  expect(fixture.ack).not.toHaveBeenCalled();
  expect(fixture.nack).toHaveBeenCalledWith(message, false, true);
});

test("a full batch flushes immediately and later batches wait for its task", async () => {
  const fixture = await setup();

  try {
    for (let id = 1; id <= 50; id++)
      fixture.dispatch("search-players-index", [player(id)]);
    await until(() => fixture.writes.length === 1, 1000);
    expect(fixture.writes[0]?.documents).toHaveLength(50);
    fixture.dispatch("search-players-index", [player(51)]);
    await Bun.sleep(2100);
    expect(fixture.writes).toHaveLength(1);
    fixture.complete(1);
    await until(() => fixture.writes.length === 2);
    expect(fixture.ack).toHaveBeenCalledTimes(50);
    fixture.complete(2);
    await until(() => fixture.ack.mock.calls.length === 51);
    expect(fixture.nack).not.toHaveBeenCalled();
  } finally {
    await fixture.runtime.dispose();
  }
}, 10000);

test("shutdown requeues an in-flight batch while Meilisearch is still running", async () => {
  const fixture = await setup();

  try {
    const first = fixture.dispatch("search-players-index", [player(1)]);
    const second = fixture.dispatch("search-players-index", [player(2)]);

    await until(() => fixture.writes.length === 1);
    await fixture.runtime.dispose();
    expect(fixture.ack).not.toHaveBeenCalled();
    expect(fixture.nack).toHaveBeenCalledWith(first, false, true);
    expect(fixture.nack).toHaveBeenCalledWith(second, false, true);
  } finally {
    await fixture.runtime.dispose();
  }
}, 10000);

test("shutdown during retry backoff requeues every unacknowledged delivery", async () => {
  const fixture = await setup();

  try {
    const first = fixture.dispatch("search-players-index", [player(1)]);
    const second = fixture.dispatch("search-players-index", [player(2)]);
    await until(() => fixture.writes.length === 1);
    fixture.complete(1, "failed");
    await Bun.sleep(20);
    expect(fixture.nack).not.toHaveBeenCalled();
    await fixture.runtime.dispose();
    expect(fixture.ack).not.toHaveBeenCalled();
    expect(fixture.nack).toHaveBeenCalledWith(first, false, true);
    expect(fixture.nack).toHaveBeenCalledWith(second, false, true);
    expect(fixture.writes).toHaveLength(1);
  } finally {
    await fixture.runtime.dispose();
  }
}, 10000);
