import { describe, expect, test } from "bun:test";
import { Effect } from "effect";
import { Meilisearch, type SearchParams } from "meilisearch";
import { makeItemsModule } from "#src/items/items.service";
import type { NpcHit } from "#src/npcs/npc-hit";
import { makeNpcsModule } from "#src/npcs/npcs.service";
import { catalogIndexSettings } from "#src/projection/index-settings";
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

const unusedWrite = () => Effect.die("catalog reads never write");

describe("Catalog search modules", () => {
  test("builds bounded filters on filterable attributes only", async () => {
    const searches: Array<{ term: string; options: SearchParams }> = [];

    const client = makeClient((name) => ({
      search: (term: string, options: SearchParams) => {
        // Meilisearch rejects a filter on an attribute the index does not list.
        const filterable =
          new Map(Object.entries(catalogIndexSettings)).get(name)
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
      makeNpcsModule(client, unusedWrite, silentLogger).getNpcs({
        ids: [1, 2],
        limit: 10,
        search: "Hero",
      }),
    );
    await Effect.runPromise(
      makeItemsModule(client, unusedWrite, silentLogger).getItems({
        limit: 10,
        search: "Sword",
      }),
    );

    expect(searches).toEqual([
      {
        term: "Hero",
        options: expect.objectContaining({ filter: "id IN [1, 2]" }),
      },
      {
        term: "Sword",
        options: expect.not.objectContaining({ filter: expect.anything() }),
      },
    ]);
  });

  test("keeps the first NPC per name and type unless ids are requested", async () => {
    const first = {
      id: 7,
      identityNamespace: "legacy",
      name: "Hero",
      icon: "npc.gif",
      lvl: 100,
      wt: 80,
      type: "HERO",
      margonemType: 2,
      prof: "w",
      worlds: ["berufs"],
      gameVersion: "pl",
    } satisfies NpcHit;

    const hits = [first, { ...first, id: 8, lvl: 150 }];

    const client = makeClient(() => ({
      search: () => Promise.resolve({ hits }),
    }));

    const npcs = makeNpcsModule(client, unusedWrite, silentLogger);

    expect(await Effect.runPromise(npcs.getNpcs({ limit: 10 }))).toEqual([
      first,
    ]);
    expect(
      await Effect.runPromise(npcs.getNpcs({ limit: 10, ids: [7, 8] })),
    ).toEqual(hits);
  });
});
