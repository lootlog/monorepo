import { expect, test } from "bun:test";
import { Effect } from "effect";
import { Meilisearch } from "meilisearch";
import { backfillNpcCatalogKeys } from "./npc-catalog-backfill.js";
import { toNpcDocument } from "./npcs.service.js";

test("catalog backfill preserves legacy documents across pages and reruns", async () => {
  const documents = Array.from({ length: 501 }, (_, index) => ({
    uid: `${index + 1}_2_test`,
    id: index + 1,
    world: "test",
    // Older catalog entries can carry Margonem type in the type field.
    type: 2,
    name: `NPC ${index + 1}`,
    lvl: 183,
    icon: "npc.gif",
    customField: "preserve",
  }));

  const stored = new Map<
    string,
    (typeof documents)[number] & { catalogKey?: string }
  >(documents.map((document) => [document.uid, document]));

  const batchSizes: number[] = [];

  const client = new Meilisearch({
    host: "http://search.invalid",
    httpClient: (input, init) => {
      const url = new URL(String(input));

      if (url.pathname.startsWith("/tasks/"))
        return Promise.resolve({ uid: 1, status: "succeeded" });

      if (url.pathname.endsWith("/settings"))
        return Promise.resolve({ filterableAttributes: ["catalogKey"] });

      if (url.pathname.endsWith("/documents/fetch")) {
        const query: { limit: number } = JSON.parse(String(init?.body));

        return Promise.resolve({
          results: [...stored.values()]
            .filter((document) => document.catalogKey === undefined)
            .slice(0, query.limit),
        });
      }

      const updates: { uid: string; catalogKey: string }[] = JSON.parse(
        String(init?.body),
      );

      batchSizes.push(updates.length);

      for (const update of updates) {
        const previous = stored.get(update.uid);

        if (!previous) throw new Error("Backfill tried to create a document");
        stored.set(update.uid, { ...previous, ...update });
      }

      return Promise.resolve({ taskUid: 1, status: "enqueued" });
    },
  });

  expect(await Effect.runPromise(backfillNpcCatalogKeys(client))).toEqual({
    updated: 501,
    complete: true,
  });
  expect(batchSizes).toEqual([500, 1]);
  expect([...stored.values()]).toEqual(
    documents.map((document) => ({
      ...document,
      catalogKey: document.uid,
    })),
  );
  expect(await Effect.runPromise(backfillNpcCatalogKeys(client))).toEqual({
    updated: 0,
    complete: true,
  });
  expect(batchSizes).toEqual([500, 1]);

  const fresh = toNpcDocument({
    id: 1,
    world: "test",
    type: "ELITE2",
    margonemType: 2,
    name: "NPC 1",
    icon: "new.gif",
    lvl: 210,
    wt: 20,
    prof: "w",
    snapshotHash: "new",
  });

  expect(stored.get("1_2_test")?.catalogKey).toBe(fresh.catalogKey);
});
