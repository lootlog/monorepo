import { expect, test } from "bun:test";
import { Effect } from "effect";
import { Meilisearch } from "meilisearch";
import { npcCatalogKey } from "#src/npcs/npcs.service";
import { itemCatalogKey, makeItemsModule } from "./items.service.js";

const logger = { info() {}, warn() {}, error() {} };

const item = (id: number, world = "new") => ({
  id,
  name: `Item ${id}`,
  world,
  icon: "item.gif",
  stat: "",
  lvl: 1,
  rarity: null,
  type: null,
  gameVersion: "pl" as const,
});

test("batches existing-world reads and preserves worlds across duplicate and missing documents", async () => {
  const batches: string[][] = [];
  const written: unknown[] = [];
  const writeSizes: number[] = [];

  const client = new Meilisearch({
    host: "http://search.invalid",
    httpClient: (input, init) => {
      const url = new URL(String(input));

      if (
        (init?.method ?? "GET").toUpperCase() === "GET" &&
        url.pathname.endsWith("/documents")
      ) {
        const ids = (url.searchParams.get("ids") ?? "").split(",");
        batches.push(ids);
        expect(url.searchParams.get("limit")).toBe(String(ids.length));
        expect(url.searchParams.has("fields")).toBe(false);

        const stored = itemCatalogKey(item(1));

        return Promise.resolve({
          results: ids.includes(stored)
            ? [{ uid: stored, worlds: ["old", "new"] }]
            : [],
        });
      }

      if (url.pathname.startsWith("/tasks/"))
        return Promise.resolve({ uid: 1, status: "succeeded" });
      const documents: unknown[] = JSON.parse(String(init?.body));
      written.push(...documents);
      writeSizes.push(documents.length);

      return Promise.resolve({ taskUid: 1, status: "enqueued" });
    },
  });

  await Effect.runPromise(
    makeItemsModule(client, logger).indexItems({
      items: [
        ...Array.from({ length: 101 }, (_, index) => item(index + 1)),
        item(1, "other"),
      ],
    }),
  );
  expect(batches.map((batch) => batch.length)).toEqual([100, 1]);
  expect(written).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        uid: itemCatalogKey(item(1)),
        worlds: ["new", "old", "other"],
      }),
      expect.objectContaining({
        uid: itemCatalogKey(item(101)),
        worlds: ["new"],
      }),
    ]),
  );
  expect(written).toHaveLength(101);
  expect(writeSizes).toEqual([101]);
});

test("keeps each edition and name of one item searchable instead of the last observation", async () => {
  const written: Array<{ uid: string; name: string; worlds: string[] }> = [];

  const client = new Meilisearch({
    host: "http://search.invalid",
    httpClient: (input, init) => {
      const url = new URL(String(input));

      if ((init?.method ?? "GET").toUpperCase() === "GET") {
        return Promise.resolve(
          url.pathname.startsWith("/tasks/")
            ? { uid: 1, status: "succeeded" }
            : { results: [] },
        );
      }

      written.push(...JSON.parse(String(init?.body)));

      return Promise.resolve({ taskUid: 1, status: "enqueued" });
    },
  });

  const trophy = (name: string, world: string, gameVersion: "en" | "pl") => ({
    ...item(62_271, world),
    name,
    gameVersion,
  });

  await Effect.runPromise(
    makeItemsModule(client, logger).indexItems({
      items: [
        trophy("Seth's War Trophy", "gordion", "pl"),
        trophy("Wojenne trofeum Seta", "tarhuna", "pl"),
        trophy("Wojenne trofeum Seta", "katahha", "pl"),
        trophy("Seth's War Trophy", "cronus", "en"),
        trophy("Seth's War Trophy", "husaria", "en"),
      ],
    }),
  );

  expect(
    written
      .map(({ name, worlds }) => [name, worlds])
      .sort((left, right) => String(left).localeCompare(String(right))),
  ).toEqual([
    ["Seth's War Trophy", ["cronus", "husaria"]],
    ["Seth's War Trophy", ["gordion"]],
    ["Wojenne trofeum Seta", ["katahha", "tarhuna"]],
  ]);
});

test("failed existing-world reads prevent overwriting indexed worlds", async () => {
  const requests: string[] = [];

  const client = new Meilisearch({
    host: "http://search.invalid",
    httpClient: (input) => {
      requests.push(new URL(String(input)).pathname);

      return Promise.reject(new Error("unavailable"));
    },
  });

  const failure = await Effect.runPromise(
    makeItemsModule(client, logger)
      .indexItems({ items: [item(1)] })
      .pipe(Effect.flip),
  );

  expect(failure._tag).toBe("SearchOperationFailure");
  expect(requests).toEqual(["/indexes/items/documents"]);
});

test("keeps an item's earliest sighting and every NPC it dropped from across reordered deliveries", async () => {
  const written: Array<{ uid: string; firstSeenAt: number | null }> = [];
  const nosferatu = npcDrop(7001, "Nosferatu");
  const stored = itemCatalogKey(item(1));

  const client = new Meilisearch({
    host: "http://search.invalid",
    httpClient: (input, init) => {
      const url = new URL(String(input));

      if ((init?.method ?? "GET").toUpperCase() === "GET") {
        return Promise.resolve(
          url.pathname.startsWith("/tasks/")
            ? { uid: 1, status: "succeeded" }
            : {
                results: [
                  {
                    uid: stored,
                    worlds: ["new"],
                    firstSeenAt: Date.parse("2026-10-20T12:00:00.000Z"),
                    droppedBy: [nosferatu.source],
                    droppedByKeys: [nosferatu.source.key],
                  },
                ],
              },
        );
      }

      written.push(...JSON.parse(String(init?.body)));

      return Promise.resolve({ taskUid: 1, status: "enqueued" });
    },
  });

  const vampire = npcDrop(7002, "Wampir");

  await Effect.runPromise(
    makeItemsModule(client, logger).indexItems({
      items: [
        // A redelivered later sighting, then an earlier one from another NPC.
        {
          ...item(1),
          observedAt: "2026-10-25T08:00:00.000Z",
          droppedBy: nosferatu.indexed,
        },
        {
          ...item(1),
          observedAt: "2026-10-18T21:30:00.000Z",
          droppedBy: vampire.indexed,
        },
      ],
    }),
  );

  expect(written).toEqual([
    expect.objectContaining({
      uid: stored,
      firstSeenAt: Date.parse("2026-10-18T21:30:00.000Z"),
      droppedByKeys: [nosferatu.source.key, vampire.source.key],
    }),
  ]);
});

function npcDrop(id: number, name: string) {
  const indexed = {
    id,
    identityNamespace: "template" as const,
    name,
    lvl: 100,
    icon: "npc.gif",
    type: "HERO",
    margonemType: 2,
    gameVersion: "pl" as const,
  };

  return {
    indexed,
    source: {
      key: npcCatalogKey(indexed),
      id,
      identityNamespace: "template",
      gameVersion: "pl",
      name,
      lvl: 100,
      icon: "npc.gif",
      type: "HERO",
    },
  };
}
