import { describe, expect, test } from "bun:test";
import { Effect, Predicate } from "effect";
import { Meilisearch, type SearchParams } from "meilisearch";
import { searchIndexSettings } from "#src/http-api/search-operations";
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
  test("builds bounded filters on filterable attributes only", async () => {
    const searches: Array<{ term: string; options: SearchParams }> = [];

    const client = makeClient((name) => ({
      search: (term: string, options: SearchParams) => {
        // Meilisearch rejects a filter on an attribute the index does not list.
        const filterable =
          new Map(Object.entries(searchIndexSettings)).get(name)
            ?.filterableAttributes ?? [];

        const attributes = [
          ...String(options.filter ?? "").matchAll(
            /(\w+) (?:IN|=|!=|>=|<=|>|<) /g,
          ),
        ].map(([, attribute]) => attribute ?? "");

        const rejected = attributes.find(
          (attribute) => !filterable.some((entry) => entry === attribute),
        );

        if (rejected)
          return Promise.reject(
            new Error(`Attribute \`${rejected}\` is not filterable`),
          );

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
    expect(searches).toEqual([
      {
        term: "",
        options: expect.objectContaining({
          filter: 'name IN ["Player One", "Player Two"] AND world = "berufs"',
        }),
      },
    ]);
  });

  test("generates stable player document ids and excludes invalid records", async () => {
    const indexed: unknown[] = [];

    const client = makeClient((name) => ({
      uid: name,
      getDocuments: () => Promise.resolve({ results: [] }),
      addDocuments: (
        documents: ReadonlyArray<{
          id: string | number;
          name: string;
          uid: string;
        }>,
      ) => {
        indexed.push(documents);

        return {
          waitTask: () => Promise.resolve({ uid: 1, status: "succeeded" }),
        };
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
          {
            id: "2",
            name: "",
            lvl: 100,
            prof: "w",
            icon: "warrior.gif",
            characterId: 2,
            accountId: 2,
            world: "berufs",
          },
        ],
      }),
    );
    expect(indexed[0]).toEqual([
      expect.objectContaining({ uid: "1_PlayerOne_berufs" }),
    ]);
  });

  test("propagates failed public searches", async () => {
    const client = makeClient(() => ({
      search: () => Promise.reject(new Error("search unavailable")),
    }));

    const players = makePlayersModule(client, silentLogger);

    const failure = await Effect.runPromise(
      players.getPlayers({ limit: 10 }).pipe(Effect.flip),
    );

    expect(Predicate.isTagged("SearchOperationFailure")(failure)).toBe(true);
    expect(failure).toMatchObject({ operation: "search.players" });
  });

  test("returns a typed failure so Rabbit can requeue failed indexing", async () => {
    const client = makeClient((name) => ({
      uid: name,
      getDocuments: () => Promise.resolve({ results: [] }),
      addDocuments: () => ({
        waitTask: () => Promise.reject(new Error("index unavailable")),
      }),
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
});
