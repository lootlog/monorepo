import { expect, test } from "bun:test";
import { Effect } from "effect";
import { Meilisearch } from "meilisearch";
import { makePlayersModule } from "../players/players.service.js";
import { configureMeilisearchIndexes } from "./meilisearch-indexes.service.js";

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
    httpClient: (input) => {
      const path = new URL(String(input)).pathname;
      requests.push(path);
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
  expect(requests).toEqual(["/indexes/players/documents", "/tasks/1"]);
});
