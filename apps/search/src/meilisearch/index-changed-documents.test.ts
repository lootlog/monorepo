import { expect, test } from "bun:test";
import { Effect } from "effect";
import { Meilisearch } from "meilisearch";
import { makePlayersModule } from "../players/players.service.js";
import { makeNpcsModule } from "../npcs/npcs.service.js";
import { makeItemsModule } from "../items/items.service.js";

const logger = { info() {}, warn() {}, error() {} };

for (const catalog of ["players", "npcs", "items"] as const) {
  test(`${catalog} skips redelivery, keeps latest duplicate and reindexes changes`, async () => {
    const stored = new Map<string, { uid: string }>();
    const writes: unknown[][] = [];

    const client = new Meilisearch({
      host: "http://search.invalid",
      httpClient: (input, init) => {
        const url = new URL(String(input));

        if (url.pathname.startsWith("/tasks/"))
          return Promise.resolve({ uid: 1, status: "succeeded" });

        if ((init?.method ?? "GET").toUpperCase() === "GET") {
          const ids = (url.searchParams.get("ids") ?? "").split(",");

          return Promise.resolve({
            results: ids.flatMap((id) =>
              stored.has(id) ? [stored.get(id)] : [],
            ),
          });
        }

        const documents: { uid: string }[] = JSON.parse(String(init?.body));
        writes.push(documents);

        for (const document of documents) stored.set(document.uid, document);

        return Promise.resolve({ taskUid: 1, status: "enqueued" });
      },
    });

    const index = (levels: number[]) => {
      const common = {
        name: "Name",
        world: "test",
        icon: "icon.gif",
        prof: "w",
      };

      if (catalog === "players")
        return makePlayersModule(client, logger).indexPlayers({
          players: levels.map((lvl) => ({
            ...common,
            id: "1",
            accountId: 1,
            characterId: 1,
            lvl,
          })),
        });

      if (catalog === "npcs")
        return makeNpcsModule(client, logger).indexNpcs({
          npcs: levels.map((lvl) => ({
            ...common,
            id: 1,
            lvl,
            wt: 80,
            margonemType: 2,
            type: "hero",
          })),
        });

      return makeItemsModule(client, logger).indexItems({
        items: levels.map((lvl) => ({
          id: 1,
          name: common.name,
          world: common.world,
          icon: common.icon,
          lvl,
          stat: "lvl=1",
          rarity: null,
          type: null,
        })),
      });
    };

    await Effect.runPromise(index([1, 2]));
    expect(writes).toEqual([[expect.objectContaining({ lvl: 2 })]]);
    await Effect.runPromise(index([2]));
    expect(writes).toHaveLength(1);
    await Effect.runPromise(index([3]));
    expect(writes).toHaveLength(2);
    expect(writes[1]).toEqual([expect.objectContaining({ lvl: 3 })]);
  });
}

test("bounds writes to 500 documents and retries only the failed chunk", async () => {
  const readSizes: number[] = [];
  const writeSizes: number[] = [];
  const stored = new Map<string, { uid: string }>();

  const client = new Meilisearch({
    host: "http://search.invalid",
    httpClient: (input, init) => {
      const url = new URL(String(input));

      if (url.pathname.startsWith("/tasks/"))
        return Promise.resolve({
          uid: writeSizes.length,
          status: writeSizes.length === 2 ? "failed" : "succeeded",
        });

      if ((init?.method ?? "GET").toUpperCase() === "GET") {
        const ids = (url.searchParams.get("ids") ?? "").split(",");
        readSizes.push(ids.length);

        return Promise.resolve({
          results: ids.flatMap((id) =>
            stored.has(id) ? [stored.get(id)] : [],
          ),
        });
      }

      const documents: { uid: string }[] = JSON.parse(String(init?.body));
      writeSizes.push(documents.length);

      if (writeSizes.length !== 2) {
        for (const document of documents) stored.set(document.uid, document);
      }

      return Promise.resolve({
        taskUid: writeSizes.length,
        status: "enqueued",
      });
    },
  });

  const index = makePlayersModule(client, logger).indexPlayers({
    players: Array.from({ length: 501 }, (_, id) => ({
      id: String(id + 1),
      name: "Player",
      world: "test",
      icon: "icon.gif",
      prof: "w",
      lvl: 1,
      accountId: 1,
      characterId: id + 1,
    })),
  });

  const failure = await Effect.runPromise(index.pipe(Effect.flip));

  expect(failure._tag).toBe("SearchOperationFailure");
  expect(readSizes).toEqual([100, 100, 100, 100, 100, 1]);
  expect(writeSizes).toEqual([500, 1]);
  expect(stored.size).toBe(500);
  await Effect.runPromise(index);
  expect(writeSizes).toEqual([500, 1, 1]);
  expect(stored.size).toBe(501);
});
