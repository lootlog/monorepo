import { expect, test } from "bun:test";
import { Effect } from "effect";
import { Meilisearch } from "meilisearch";
import { makeCatalogModule } from "./catalog.service.js";

const logger = { info() {}, warn() {}, error() {} };

/** A Meilisearch that answers item searches with `hits` and NPC searches with `npcs`. */
const catalogWith = (hits: unknown[], npcs: unknown[] = []) => {
  const searches: Array<{ filter?: string; attributesToRetrieve?: string[] }> =
    [];

  const npcSearches: Array<{
    filter?: string;
    attributesToRetrieve?: string[];
  }> = [];

  const client = new Meilisearch({
    host: "http://search.invalid",
    httpClient: (input, init) => {
      const isNpcSearch = String(input).includes("/indexes/npcs/");
      const results = isNpcSearch ? npcs : hits;

      (isNpcSearch ? npcSearches : searches).push(
        JSON.parse(String(init?.body)),
      );

      return Promise.resolve({
        hits: results,
        estimatedTotalHits: results.length,
      });
    },
  });

  return { catalog: makeCatalogModule(client, logger), searches, npcSearches };
};

const nosferatu = {
  key: "pl_template_7001_2",
  monsterKey: "pl_Nosferatu_HERO",
  id: 7001,
  name: "Nosferatu",
  lvl: 120,
  icon: "nosferatu.gif",
  type: "HERO",
};

const stored = (
  source: typeof nosferatu,
  identityNamespace: "template" | "runtime",
) => ({ ...source, identityNamespace, gameVersion: "pl" });

test("lists a monster's drops from any of its identities, without worlds or when Lootlog first saw them", async () => {
  const { catalog, searches } = catalogWith(
    [
      {
        id: 1,
        name: "Kieł Nosferatu",
        icon: "kiel.gif",
        stat: "",
        lvl: 120,
        rarity: "LEGENDARY",
        type: "ONE_HAND_WEAPON",
        // The same boss as seen by an older client and by a current one.
        droppedBy: [
          stored(
            { ...nosferatu, key: "pl_runtime_9001_2", id: 9001 },
            "runtime",
          ),
          stored(nosferatu, "template"),
        ],
      },
    ],
    [{ monsterKey: nosferatu.monsterKey }],
  );

  const response = await Effect.runPromise(
    catalog.getItems({
      droppedBy: "pl_runtime_9001_2",
      rarities: ["LEGENDARY"],
      sort: "lvl:desc",
    }),
  );

  expect(response.hits).toEqual([
    expect.objectContaining({
      name: "Kieł Nosferatu",
      droppedBy: [
        {
          key: "pl_template_7001_2",
          id: 7001,
          name: "Nosferatu",
          lvl: 120,
          icon: "nosferatu.gif",
          type: "HERO",
        },
      ],
    }),
  ]);
  expect(searches[0]).toMatchObject({
    filter:
      'rarity IN ["LEGENDARY"] AND droppedByMonsterKeys = "pl_Nosferatu_HERO"',
    sort: ["lvl:desc"],
  });
  // A first sighting dates a boss kill, and so its respawn.
  expect(searches[0]?.attributesToRetrieve).not.toContain("worlds");
  expect(searches[0]?.attributesToRetrieve).not.toContain("firstSeenAt");
});

test("a malformed NPC key matches nothing instead of reaching the filter", async () => {
  const { catalog, searches } = catalogWith([]);

  const response = await Effect.runPromise(
    catalog.getItems({ droppedBy: 'x" OR rarity EXISTS OR "' }),
  );

  expect(response).toEqual({ hits: [], estimatedTotalHits: 0 });
  expect(searches).toEqual([]);
});

test("finds one edition's NPCs by id", async () => {
  const { catalog, npcSearches } = catalogWith([]);

  await Effect.runPromise(
    catalog.getNpcs({ gameVersion: "pl", ids: [257036, 257037] }),
  );

  expect(npcSearches[0]).toMatchObject({
    filter: 'gameVersion = "pl" AND id IN [257036, 257037]',
  });
  expect(npcSearches[0]?.attributesToRetrieve).not.toContain("firstSeenAt");
});

test("narrows items to one edition's drops of a kind of boss that carry the required stats and bonuses", async () => {
  const { catalog, searches } = catalogWith([]);

  await Effect.runPromise(
    catalog.getItems({
      gameVersion: "pl",
      statKeys: ["legbon", "crit"],
      legendaryBonuses: ["verycrit", "curse"],
      dropSourceTypes: ["TITAN"],
    }),
  );

  expect(searches[0]?.filter).toBe(
    `gameVersion = "pl" AND statsKeys = "legbon" AND statsKeys = "crit" AND legendaryBonus IN ["verycrit", "curse"] AND droppedByTypes IN ["TITAN"]`,
  );
});
