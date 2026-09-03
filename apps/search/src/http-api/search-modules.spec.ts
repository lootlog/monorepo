import { describe, expect, test } from "bun:test";
import { Effect } from "effect";
import { Meilisearch } from "meilisearch";
import { makeItemsModule } from "#src/items/items.service";
import { configureMeilisearchIndexes } from "#src/meilisearch/meilisearch-indexes.service";
import { makeNpcsModule } from "#src/npcs/npcs.service";
import { makePlayersModule } from "#src/players/players.service";
import type { AppLogger } from "#src/shared/logger";

const silentLogger: AppLogger = {
  error: () => undefined,
  info: () => undefined,
  warn: () => undefined,
};

const makeClient = (index: (name: string) => object): Meilisearch => {
  const client = new Meilisearch({ host: "http://search.invalid" });
  Object.defineProperty(client, "index", { value: index });
  return client;
};

describe("Search Effect modules", () => {
  test("builds bounded player and NPC filters", async () => {
    const searches: Array<{ term: string; options: unknown }> = [];
    const client = makeClient(() => ({
      search: (term: string, options: unknown) => {
        searches.push({ term, options });
        return Promise.resolve({ hits: [] });
      },
    }));

    await Effect.runPromise(
      makePlayersModule(client, silentLogger).getPlayers({
        limit: 10,
        search: ["Player One", "Player Two"],
        world: "berufs",
      }),
    );
    await Effect.runPromise(
      makeNpcsModule(client, silentLogger).getNpcs({
        ids: [1, 2],
        limit: 10,
        search: "Hero",
        world: "berufs",
      }),
    );

    expect(searches).toEqual([
      {
        term: "",
        options: expect.objectContaining({
          filter: 'name IN ["Player One", "Player Two"] AND world = "berufs"',
        }),
      },
      {
        term: "Hero",
        options: expect.objectContaining({
          filter: 'id IN [1, 2] AND world = "berufs"',
        }),
      },
    ]);
  });

  test("generates stable player and NPC document ids", async () => {
    const indexed: unknown[] = [];
    const client = makeClient(() => ({
      addDocuments: (documents: unknown) => {
        indexed.push(documents);
        return Promise.resolve({ taskUid: 1 });
      },
    }));

    await Effect.runPromise(
      makePlayersModule(client, silentLogger).indexPlayers({
        players: [
          {
            id: "1",
            name: "Player One!",
            lvl: 100,
            prof: "w",
            icon: "warrior.gif",
            characterId: 1,
            accountId: 2,
            world: "berufs",
          },
        ],
      }),
    );
    await Effect.runPromise(
      makeNpcsModule(client, silentLogger).indexNpcs({
        npcs: [
          {
            id: 7,
            name: "Hero",
            icon: "npc.gif",
            lvl: 100,
            wt: 80,
            type: "hero",
            margonemType: 2,
            prof: null,
            world: "berufs",
          },
        ],
      }),
    );

    expect(indexed[0]).toEqual([
      expect.objectContaining({ uid: "1_PlayerOne_berufs" }),
    ]);
    expect(indexed[1]).toEqual([
      expect.objectContaining({ uid: "7_2_berufs" }),
    ]);
  });

  test("keeps failed public searches fail-soft", async () => {
    const client = makeClient(() => ({
      search: () => Promise.reject(new Error("search unavailable")),
    }));

    const players = makePlayersModule(client, silentLogger);

    expect(await Effect.runPromise(players.getPlayers({ limit: 10 }))).toEqual(
      [],
    );
  });

  test("returns a typed failure so Rabbit can requeue failed indexing", async () => {
    const client = makeClient(() => ({
      addDocuments: () => Promise.reject(new Error("index unavailable")),
    }));
    const players = makePlayersModule(client, silentLogger);

    const failure = await Effect.runPromise(
      Effect.flip(
        players.indexPlayers({
          players: [
            {
              id: "1",
              name: "Player One",
              lvl: 100,
              prof: "w",
              icon: "warrior.gif",
              characterId: 1,
              accountId: 2,
              world: "berufs",
            },
          ],
        }),
      ),
    );

    expect(failure._tag).toBe("SearchOperationFailure");
    expect(failure.operation).toBe("search.players.index");
  });

  test("normalizes legacy NPC hit fields", async () => {
    const client = makeClient(() => ({
      search: () =>
        Promise.resolve({
          hits: [
            {
              id: 7,
              prof: null,
              icon: "npc.gif",
              name: "Hero",
              lvl: 100,
              wt: 80,
              type: 2,
              margonemType: null,
              world: "berufs",
            },
          ],
        }),
    }));
    const npcs = makeNpcsModule(client, silentLogger);

    const result = await Effect.runPromise(npcs.getNpcs({ limit: 10 }));

    expect(result).toHaveLength(1);
    expect(result[0]?.margonemType).toBe(2);
    expect(result[0]?.prof).toBe("");
  });

  test("merges item worlds before indexing", async () => {
    let indexedDocuments: unknown;
    const client = makeClient(() => ({
      getDocument: () => Promise.resolve({ worlds: ["jaruna"] }),
      addDocuments: (documents: unknown) => {
        indexedDocuments = documents;
        return Promise.resolve({ taskUid: 1 });
      },
    }));
    const items = makeItemsModule(client, silentLogger);

    await Effect.runPromise(
      items.indexItems({
        items: [
          {
            id: 42,
            name: "Item",
            icon: "item.gif",
            stat: "lvl=1",
            lvl: 1,
            rarity: null,
            type: null,
            world: "berufs",
          },
          {
            id: 42,
            name: "Item",
            icon: "item.gif",
            stat: "lvl=1",
            lvl: 1,
            rarity: null,
            type: null,
            world: "gefion",
          },
        ],
      }),
    );

    expect(indexedDocuments).toEqual([
      expect.objectContaining({
        id: 42,
        uid: "42",
        worlds: ["berufs", "gefion", "jaruna"],
      }),
    ]);
  });

  test("creates missing indexes and applies their searchable fields", async () => {
    const created: string[] = [];
    const searchable: unknown[] = [];
    const task = { waitTask: () => Promise.resolve() };
    const client = new Meilisearch({ host: "http://search.invalid" });
    Object.defineProperties(client, {
      getIndex: {
        value: () => Promise.reject({ cause: { code: "index_not_found" } }),
      },
      createIndex: {
        value: (name: string) => {
          created.push(name);
          return task;
        },
      },
      index: {
        value: () => ({
          updateDistinctAttribute: () => task,
          updateFilterableAttributes: () => task,
          updateSearchableAttributes: (fields: unknown) => {
            searchable.push(fields);
            return task;
          },
          updateSortableAttributes: () => task,
        }),
      },
    });

    await Effect.runPromise(configureMeilisearchIndexes(client, silentLogger));

    expect(created).toHaveLength(3);
    expect(searchable).toEqual([["name", "stat"]]);
  });
});
