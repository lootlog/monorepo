import { expect, test } from "bun:test";
import { Effect } from "effect";
import { Meilisearch } from "meilisearch";
import { makeNpcsModule, npcCatalogKey } from "./npcs.service.js";

const logger = { info() {}, warn() {}, error() {} };

const completed = {
  waitTask: () => Promise.resolve({ uid: 1, status: "succeeded" }),
};

type StoredNpc = {
  uid: string;
  monsterKey?: string;
  worlds?: string[];
  observedLootId?: number;
  locations?: ReadonlyArray<{ map: string; share: number }>;
};

/** A Meilisearch whose NPC index holds `stored` and records every write. */
const npcsWith = (stored: ReadonlyArray<StoredNpc>) => {
  const reads: Array<{ filter?: string }> = [];
  const added: unknown[] = [];
  const updated: unknown[] = [];

  const client = new Meilisearch({ host: "http://search.invalid" });

  Object.defineProperty(client, "index", {
    value: () => ({
      uid: "npcs",
      getDocuments: (query: { filter?: string; ids?: string[] }) => {
        reads.push(query);

        return Promise.resolve({
          results: query.ids
            ? stored.filter(({ uid }) => query.ids?.includes(uid))
            : stored,
        });
      },
      addDocuments: (documents: unknown[]) => {
        added.push(...documents);

        return completed;
      },
      updateDocuments: (documents: unknown[]) => {
        updated.push(...documents);

        return completed;
      },
    }),
  });

  return { npcs: makeNpcsModule(client, logger), reads, added, updated };
};

const moved = [
  { map: "Nowa grota", share: 0.9 },
  { map: "Stara grota", share: 0.1 },
];

test("writes a monster's maps to each of its catalog identities whose maps changed", async () => {
  const { npcs, reads, updated } = npcsWith([
    {
      uid: "pl_template_7_2",
      monsterKey: "pl_Mietek Żul_HERO",
      locations: [{ map: "Stara grota", share: 1 }],
    },
    { uid: "pl_7_2", monsterKey: "pl_Mietek Żul_HERO" },
    {
      uid: "pl_template_8_2",
      monsterKey: "pl_Kostucha_HERO",
      locations: [{ map: "Cmentarz", share: 1 }],
    },
  ]);

  await Effect.runPromise(
    npcs.setLocations({
      monsters: [
        {
          gameVersion: "pl",
          name: "Mietek Żul",
          type: "HERO",
          locations: moved,
        },
        {
          gameVersion: "pl",
          name: "Kostucha",
          type: "HERO",
          locations: [{ map: "Cmentarz", share: 1 }],
        },
      ],
    }),
  );

  expect(reads[0]?.filter).toBe(
    'monsterKey IN ["pl_Mietek Żul_HERO", "pl_Kostucha_HERO"]',
  );
  // Only the locations are written, so loots indexed meanwhile survive.
  expect(updated).toEqual([
    { uid: "pl_template_7_2", locations: moved },
    { uid: "pl_7_2", locations: moved },
  ]);
});

test("keeps an NPC's maps when a new loot indexes it again", async () => {
  const npc = {
    id: 7,
    identityNamespace: "template" as const,
    name: "Mietek Żul",
    icon: "npc.gif",
    lvl: 100,
    wt: 80,
    type: "HERO",
    margonemType: 2,
    prof: null,
    world: "berufs",
    gameVersion: "pl" as const,
    lootId: 2,
  };

  const { npcs, added } = npcsWith([
    {
      uid: npcCatalogKey(npc),
      worlds: ["berufs"],
      observedLootId: 1,
      locations: moved,
    },
  ]);

  await Effect.runPromise(npcs.indexNpcs({ npcs: [npc] }));

  expect(added).toEqual([
    expect.objectContaining({ uid: npcCatalogKey(npc), locations: moved }),
  ]);
});
