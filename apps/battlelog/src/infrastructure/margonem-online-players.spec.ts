import { expect, it } from "bun:test";
import { Effect } from "effect";
import { HttpClient, HttpClientResponse } from "effect/http";
import { TestClock } from "effect/testing";
import { makeMargonemOnlinePlayers } from "./margonem-online-players.js";

const servingSnapshots = (
  snapshots: Array<Array<{ a: string; c: string }>>,
) => {
  let reads = 0;

  const client = HttpClient.make((request) =>
    Effect.sync(() => {
      const snapshot = snapshots[Math.min(reads, snapshots.length - 1)];
      reads += 1;

      return HttpClientResponse.fromWeb(request, Response.json(snapshot));
    }),
  );

  return { client, reads: () => reads };
};

const query = { world: "tempest", accountId: "9101", characterId: "101" };

it("reads the list again for a character that went online after the cached copy", async () => {
  const margonem = servingSnapshots([[], [{ a: "9101", c: "101" }]]);

  const onlinePlayers = makeMargonemOnlinePlayers(
    { onlinePlayersUrl: "https://margonem.test/online" },
    margonem.client,
  );

  const [early, later] = await Effect.runPromise(
    Effect.gen(function* () {
      const early = yield* onlinePlayers.isOnlineUnderAccount(query);
      yield* TestClock.adjust("11 seconds");
      const later = yield* onlinePlayers.isOnlineUnderAccount(query);

      return [early, later];
    }).pipe(Effect.provide(TestClock.layer())),
  );

  expect(early).toBe(false);
  expect(later).toBe(true);
  expect(margonem.reads()).toBe(2);
});
