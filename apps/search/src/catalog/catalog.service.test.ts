import { expect, setSystemTime, test } from "bun:test";
import { Effect } from "effect";
import { Meilisearch } from "meilisearch";
import { makeCatalogModule } from "./catalog.service.js";

const logger = { info() {}, warn() {}, error() {} };

/** A Meilisearch that answers item searches with `hits` and NPC searches with `npcs`. */
const catalogWith = (hits: unknown[], npcs: unknown[] = []) => {
  const searches: Array<{ filter?: string; attributesToRetrieve?: string[] }> =
    [];

  const client = new Meilisearch({
    host: "http://search.invalid",
    httpClient: (input, init) => {
      const isNpcSearch = String(input).includes("/indexes/npcs/");
      const results = isNpcSearch ? npcs : hits;

      if (!isNpcSearch) searches.push(JSON.parse(String(init?.body)));

      return Promise.resolve({
        hits: results,
        estimatedTotalHits: results.length,
      });
    },
  });

  return { catalog: makeCatalogModule(client, logger), searches };
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

test("lists a monster's newest drops from any of its identities, by the players' day, without the time or worlds", async () => {
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
        // 23:30 UTC is already the next day in Poland.
        firstSeenAt: Date.parse("2026-10-28T23:30:00.000Z"),
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
      sort: "newest",
    }),
  );

  expect(response.hits).toEqual([
    expect.objectContaining({
      name: "Kieł Nosferatu",
      firstSeenOn: "2026-10-29",
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
  expect(response.hits[0]).not.toHaveProperty("firstSeenAt");
  expect(searches[0]).toMatchObject({
    filter:
      'rarity IN ["LEGENDARY"] AND droppedByMonsterKeys = "pl_Nosferatu_HERO"',
    sort: ["firstSeenAt:desc"],
  });
  expect(searches[0]?.attributesToRetrieve).not.toContain("worlds");
});

test("a malformed NPC key matches nothing instead of reaching the filter", async () => {
  const { catalog, searches } = catalogWith([]);

  const response = await Effect.runPromise(
    catalog.getItems({ droppedBy: 'x" OR rarity EXISTS OR "' }),
  );

  expect(response).toEqual({ hits: [], estimatedTotalHits: 0 });
  expect(searches).toEqual([]);
});

test("narrows items to recent drops of a kind of boss that carry the required stats", async () => {
  const { catalog, searches } = catalogWith([]);
  setSystemTime(new Date("2026-10-29T12:00:00.000Z"));

  try {
    await Effect.runPromise(
      catalog.getItems({
        statKeys: ["legbon", "crit"],
        dropSourceTypes: ["TITAN"],
        firstSeenWithinDays: 7,
      }),
    );
  } finally {
    setSystemTime();
  }

  expect(searches[0]?.filter).toBe(
    `statsKeys = "legbon" AND statsKeys = "crit" AND droppedByTypes IN ["TITAN"] AND firstSeenAt >= ${Date.parse("2026-10-22T12:00:00.000Z")}`,
  );
});
