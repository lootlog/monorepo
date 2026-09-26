import { expect, test } from "bun:test";
import { Effect } from "effect";
import { Meilisearch, type Settings } from "meilisearch";
import { configureMeilisearchIndexes } from "./meilisearch-indexes.service.js";

test("startup skips unchanged settings and preserves searchable attribute order", async () => {
  const settings = new Map<string, Settings>();
  const updates: { index: string; settings: Settings }[] = [];

  const client = new Meilisearch({
    host: "http://search.invalid",
    httpClient: (input, init) => {
      const path = new URL(String(input)).pathname;
      const indexName = path.split("/")[2] ?? "";

      if (path.startsWith("/tasks/"))
        return Promise.resolve({ uid: 1, status: "succeeded" });

      if (!path.endsWith("/settings"))
        return Promise.resolve({ uid: indexName });

      if (init?.method !== "PATCH")
        return Promise.resolve(settings.get(indexName) ?? {});
      const patch: Settings = JSON.parse(String(init.body));
      updates.push({ index: indexName, settings: patch });
      settings.set(indexName, { ...settings.get(indexName), ...patch });

      return Promise.resolve({ taskUid: 1, status: "enqueued" });
    },
  });

  const configure = () =>
    Effect.runPromise(
      configureMeilisearchIndexes(client, { info() {}, warn() {}, error() {} }),
    );

  await configure();
  expect(updates.map((update) => update.index).sort()).toEqual([
    "items",
    "npcs",
    "players",
  ]);
  expect(settings.get("players")).toEqual({
    filterableAttributes: ["name", "world"],
  });
  expect(settings.get("npcs")).toEqual({
    filterableAttributes: ["id", "name", "type", "world", "catalogKey"],
  });

  for (const value of settings.values()) {
    value.filterableAttributes?.reverse();
    value.sortableAttributes?.reverse();
    value.displayedAttributes = ["name"];
  }

  updates.length = 0;
  await configure();
  expect(updates).toEqual([]);

  settings.get("items")?.searchableAttributes?.reverse();
  await configure();
  expect(updates.map((update) => update.index)).toEqual(["items"]);
  expect(settings.get("items")?.searchableAttributes).toEqual(["name", "stat"]);
  expect(updates[0]?.settings.displayedAttributes).toBeUndefined();
});
