/**
 * Replays the game knowledge the API holds to the services that project it:
 * every item and NPC revision to the catalog and every looting character to
 * player search, on replay routing keys of their own so live loots are not
 * held up, then the monster statistics and item revisions the API otherwise
 * publishes each morning.
 *
 * Each message is an observation the consumers already merge from live
 * loots, sent in the order the live path would have sent it, so a replay
 * into an empty catalog builds what live indexing built, and a replay into a
 * full one changes nothing it already holds.
 *
 * Usage: `bun run catalog:replay` in `apps/api` with
 * `POSTGRESQL_CONNECTION_URI` and `RABBITMQ_URI` set. The catalog and search
 * must have declared their replay queues first.
 */
import { BunRuntime } from "@effect/platform-bun";
import { RabbitMessaging } from "@lootlog/messaging";
import {
  RabbitRoutingKey,
  type RabbitRoutingKeyName,
} from "@lootlog/protocol/rabbit/topology";
import { NpcIdentityNamespaceSchema } from "@lootlog/schema/npc-identity";
import { Config, Effect, Layer, Redacted, Schema } from "effect";
import { chunk, groupBy } from "es-toolkit";
import { ApiDatabase, ApiDatabaseLive } from "#src/database/drizzle/database";
import { makeItemRevisionsPublisher } from "#src/loots/item-revisions-publisher";
import { makeMonsterStatisticsPublisher } from "#src/loots/monster-statistics";
import {
  buildItemDropSourceQuery,
  buildItemReplayQuery,
} from "./item-replay-query.js";
import { buildNpcReplayQuery } from "./npc-replay-query.js";
import { buildPlayerReplayQuery } from "./player-replay-query.js";

const OBSERVATIONS_PER_MESSAGE = 500;

const decodeIdentityNamespace = Schema.decodeUnknownSync(
  NpcIdentityNamespaceSchema,
);

const toObservedAt = (epochMilliseconds: number) =>
  new Date(epochMilliseconds).toISOString();

/** Publishes in order, one message at a time, so the consumer sees that order. */
const publishInOrder = Effect.fn("CatalogReplay.publish")(function* (
  routingKey: RabbitRoutingKeyName,
  observations: ReadonlyArray<object>,
) {
  const rabbit = yield* RabbitMessaging;

  for (const batch of chunk([...observations], OBSERVATIONS_PER_MESSAGE)) {
    yield* rabbit.publish({
      exchange: "default",
      routingKey,
      content: new TextEncoder().encode(JSON.stringify(batch)),
    });
  }

  yield* Effect.logInfo("Replay published").pipe(
    Effect.annotateLogs({ routingKey, observations: observations.length }),
  );
});

/**
 * Each item revision once with its worlds and first sighting, then once more
 * with each NPC it came from, by the rule live indexing applies.
 */
const replayItems = Effect.gen(function* () {
  const database = yield* ApiDatabase;

  // One after the other: both aggregate every loot link.
  const rows = yield* buildItemReplayQuery(database);
  const sources = yield* buildItemDropSourceQuery(database);
  const sourcesBySnapshot = groupBy(sources, (source) => source.itemSnapshotId);

  const observations = rows.flatMap(({ snapshotId, firstSeenAt, ...item }) => {
    const observation = {
      ...item,
      lvl: item.lvl ?? 0,
      observedAt: toObservedAt(firstSeenAt),
    };

    return [
      observation,
      ...(sourcesBySnapshot[snapshotId] ?? []).map(
        ({ itemSnapshotId: _itemSnapshotId, identityNamespace, ...npc }) => ({
          ...observation,
          droppedBy: {
            ...npc,
            identityNamespace: decodeIdentityNamespace(identityNamespace),
          },
        }),
      ),
    ];
  });

  yield* publishInOrder(RabbitRoutingKey.CATALOG_ITEMS_REPLAY, observations);
});

/** Each NPC revision once per world, with the latest loot that saw it there. */
const replayNpcs = Effect.gen(function* () {
  const rows = yield* buildNpcReplayQuery(yield* ApiDatabase);

  yield* publishInOrder(
    RabbitRoutingKey.CATALOG_NPCS_REPLAY,
    rows.map((npc) => ({
      id: npc.id,
      identityNamespace: decodeIdentityNamespace(npc.identityNamespace),
      name: npc.name,
      type: npc.type ?? "",
      prof: npc.prof,
      icon: npc.icon ?? "",
      lvl: npc.lvl ?? 0,
      wt: npc.wt ?? 0,
      margonemType: npc.margonemType,
      world: npc.world,
      gameVersion: npc.gameVersion,
      lootId: npc.latestLootId,
      observedAt: toObservedAt(npc.firstSeenAt),
    })),
  );
});

const replayPlayers = Effect.gen(function* () {
  const rows = yield* buildPlayerReplayQuery(yield* ApiDatabase);

  yield* publishInOrder(
    RabbitRoutingKey.SEARCH_PLAYERS_REPLAY,
    rows.map((player) => ({
      id: `${player.characterId}${player.accountId}`,
      name: player.name,
      lvl: player.lvl ?? 0,
      prof: player.prof ?? "",
      icon: player.icon ?? "",
      characterId: player.characterId,
      accountId: player.accountId,
      world: player.world,
    })),
  );
});

/** The statistics the catalog keeps beside loots, published as each morning. */
const replayStatistics = Effect.gen(function* () {
  const database = yield* ApiDatabase;
  const rabbit = yield* RabbitMessaging;

  yield* makeMonsterStatisticsPublisher(database, rabbit);
  yield* makeItemRevisionsPublisher(database, rabbit);
});

export const replayCatalog = Effect.gen(function* () {
  yield* replayItems;
  yield* replayNpcs;
  yield* replayPlayers;
  yield* replayStatistics;
});

if (import.meta.main) {
  const RabbitLive = Layer.unwrap(
    Effect.map(Config.Redacted("RABBITMQ_URI"), (uri) =>
      RabbitMessaging.layer({
        uri: Redacted.value(uri),
        connectionName: "api-catalog-replay",
        queues: [],
      }),
    ),
  );

  BunRuntime.runMain(
    replayCatalog.pipe(
      Effect.provide([ApiDatabaseLive, RabbitLive]),
      RabbitMessaging.supervised,
    ),
  );
}
