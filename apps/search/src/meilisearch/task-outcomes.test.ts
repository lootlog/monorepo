import { expect, spyOn, test } from "bun:test";
import { Effect } from "effect";
import { Meilisearch } from "meilisearch";
import { makePlayersModule } from "../players/players.service.js";
import { configureMeilisearchIndexes } from "./meilisearch-indexes.service.js";

import { completeMeilisearchTask } from "./search-operation-failure.js";

const logger = { info() {}, warn() {}, error() {} };

const player = {
  id: "1",
  name: "Player",
  lvl: 1,
  prof: "w",
  icon: "icon.gif",
  characterId: 1,
  accountId: 1,
  world: "test",
};

const clientWithTask = (
  status: "succeeded" | "failed" | "canceled",
  requests: string[],
) =>
  new Meilisearch({
    host: "http://search.invalid",
    httpClient: (input, init) => {
      const path = new URL(String(input)).pathname;
      requests.push(path);

      if (
        path.endsWith("/documents") &&
        (init?.method ?? "GET").toUpperCase() === "GET"
      )
        return Promise.resolve({ results: [] });

      if (
        path.endsWith("/settings") &&
        (init?.method ?? "GET").toUpperCase() === "GET"
      )
        return Promise.resolve({});

      if (path.startsWith("/tasks/"))
        return Promise.resolve({
          uid: 1,
          status,
          error: status === "failed" ? { code: "invalid_settings" } : null,
        });

      if (/^\/indexes\/[^/]+$/.test(path))
        return Promise.resolve({ uid: path.split("/").at(-1) });

      return Promise.resolve({ taskUid: 1, status: "enqueued" });
    },
  });

for (const status of ["failed", "canceled"] as const) {
  test(`indexing and startup reject ${status} asynchronous tasks`, async () => {
    const requests: string[] = [];
    const client = clientWithTask(status, requests);

    const failure = await Effect.runPromise(
      makePlayersModule(client, logger)
        .indexPlayers({ players: [player] })
        .pipe(Effect.flip),
    );

    expect(failure._tag).toBe("SearchOperationFailure");
    expect(requests).toContain("/tasks/1");

    const startupFailure = await Effect.runPromise(
      configureMeilisearchIndexes(client, logger).pipe(Effect.flip),
    );

    expect(startupFailure._tag).toBe("SearchOperationFailure");
  });
}

test("indexing observes successful task completion before returning", async () => {
  const requests: string[] = [];
  await Effect.runPromise(
    makePlayersModule(
      clientWithTask("succeeded", requests),
      logger,
    ).indexPlayers({ players: [player] }),
  );
  expect(requests).toEqual([
    "/indexes/players/documents",
    "/indexes/players/documents",
    "/tasks/1",
  ]);
});

test("task polling uses a bounded timeout and a slower interval", async () => {
  const client = clientWithTask("succeeded", []);
  const task = client.index("players").addDocuments([player]);
  const wait = spyOn(task, "waitTask");

  await Effect.runPromise(completeMeilisearchTask("test.index", () => task));
  expect(wait).toHaveBeenCalledWith({ interval: 15_000, timeout: 60_000 });
});
