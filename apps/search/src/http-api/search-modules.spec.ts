import { describe, expect, test } from "bun:test";
import { Effect } from "effect";
import { Meilisearch } from "meilisearch";
import { makeItemsModule } from "#src/items/items.service";
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
});
