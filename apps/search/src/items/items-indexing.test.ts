import { expect, test } from "bun:test";
import { Effect } from "effect";
import { Meilisearch } from "meilisearch";
import { makeItemsModule } from "./items.service.js";

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

        return Promise.resolve({
          results: ids.includes("1")
            ? [{ uid: "1", world: "legacy", worlds: ["old", "new"] }]
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
        uid: "1",
        worlds: ["legacy", "new", "old", "other"],
      }),
      expect.objectContaining({ uid: "101", worlds: ["new"] }),
    ]),
  );
  expect(written).toHaveLength(101);
  expect(writeSizes).toEqual([101]);
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
