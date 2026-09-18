import { expect, test } from "bun:test";
import { Effect } from "effect";
import { Meilisearch } from "meilisearch";
import type { PlayerHit } from "./player-hit.js";
import { makePlayersModule } from "./players.service.js";

const player = (
  characterId: number,
  accountId: number,
  name = "cashtelan",
  world = "luvia",
): PlayerHit => ({
  id: `${characterId}${accountId}`,
  characterId,
  accountId,
  name,
  world,
  lvl: 302,
  prof: "PALADIN",
  icon: "player.gif",
});

test("player search prefers known accounts over legacy duplicate identities without merging worlds or known characters", async () => {
  const known = player(220, 9822301);
  const renamed = player(220, 9822301, "Previous name");
  const otherWorld = player(220, 0, "cashtelan", "other-world");
  const otherKnown = player(221, 9822302);
  const unknown = player(222, 0, "Unknown player");
  const secondKnown = player(49528, 10165423, "Cashtelan Mym Bogiem");
  const missingIdentity = player(0, 0, "Missing identity");
  const otherMissingIdentity = player(0, 0, "Another missing identity");

  const client = new Meilisearch({
    host: "http://search.invalid",
    httpClient: () =>
      Promise.resolve({
        hits: [
          player(22, 0),
          player(49528, 0, "Old name"),
          known,
          renamed,
          otherWorld,
          otherKnown,
          unknown,
          secondKnown,
          missingIdentity,
          otherMissingIdentity,
        ],
      }),
  });

  const result = await Effect.runPromise(
    makePlayersModule(client, { info() {}, warn() {}, error() {} }).getPlayers({
      search: "cash",
      limit: 10,
    }),
  );

  expect(result).toEqual([
    secondKnown,
    known,
    otherWorld,
    otherKnown,
    unknown,
    missingIdentity,
    otherMissingIdentity,
  ]);
});
