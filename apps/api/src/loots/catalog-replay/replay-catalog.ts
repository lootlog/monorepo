import { BunRuntime } from "@effect/platform-bun";
import {
  RabbitMessaging,
  eventMessage,
  type PublishOptions,
} from "@lootlog/messaging";
import { playerSearchId } from "@lootlog/protocol/rabbit/events";
import {
  RabbitRoutingKey,
  type RabbitRoutingKeyName,
} from "@lootlog/protocol/rabbit/topology";
import type {
  CatalogItemObservation,
  CatalogNpcObservation,
} from "@lootlog/protocol/rabbit/catalog";
import { Effect, Layer, Redacted } from "effect";
import { chunk, groupBy } from "es-toolkit";
import { rabbitmqUriConfig } from "#src/config/api.config";
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

const toObservedAt = (epochMilliseconds: number) =>
  new Date(epochMilliseconds).toISOString();

const publishInOrder = Effect.fn("CatalogReplay.publish")(function* <Item>(
  routingKey: RabbitRoutingKeyName,
  observations: ReadonlyArray<Item>,
  message: (batch: ReadonlyArray<Item>) => PublishOptions,
) {
  const rabbit = yield* RabbitMessaging;

  for (const batch of chunk([...observations], OBSERVATIONS_PER_MESSAGE)) {
    yield* rabbit.publish(message(batch));
  }

  yield* Effect.logInfo("Replay published").pipe(
    Effect.annotateLogs({ routingKey, observations: observations.length }),
  );
});

const replayItems = Effect.gen(function* () {
  const database = yield* ApiDatabase;

  const rows = yield* buildItemReplayQuery(database);
  const sources = yield* buildItemDropSourceQuery(database);
  const sourcesBySnapshot = groupBy(sources, (source) => source.itemSnapshotId);

  const observations = rows.flatMap(({ snapshotId, firstSeenAt, ...item }) => {
    const observation: CatalogItemObservation = {
      ...item,
      lvl: item.lvl ?? 0,
      observedAt: toObservedAt(firstSeenAt),
    };

    return [
      observation,
      ...(sourcesBySnapshot[snapshotId] ?? []).map(
        ({
          itemSnapshotId: _itemSnapshotId,
          ...npc
        }): CatalogItemObservation => ({
          ...observation,
          droppedBy: npc,
        }),
      ),
    ];
  });

  yield* publishInOrder(
    RabbitRoutingKey.CATALOG_ITEMS_REPLAY,
    observations,
    (batch) => eventMessage(RabbitRoutingKey.CATALOG_ITEMS_REPLAY, batch),
  );
});

const replayNpcs = Effect.gen(function* () {
  const rows = yield* buildNpcReplayQuery(yield* ApiDatabase);

  yield* publishInOrder(
    RabbitRoutingKey.CATALOG_NPCS_REPLAY,
    rows.map((npc): CatalogNpcObservation => ({
      id: npc.id,
      identityNamespace: npc.identityNamespace,
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
    (batch) => eventMessage(RabbitRoutingKey.CATALOG_NPCS_REPLAY, batch),
  );
});

const replayPlayers = Effect.gen(function* () {
  const rows = yield* buildPlayerReplayQuery(yield* ApiDatabase);

  yield* publishInOrder(
    RabbitRoutingKey.SEARCH_PLAYERS_REPLAY,
    rows.map((player) => ({
      id: playerSearchId(player.characterId, player.accountId),
      name: player.name,
      lvl: player.lvl ?? 0,
      prof: player.prof ?? "",
      icon: player.icon ?? "",
      characterId: player.characterId,
      accountId: player.accountId,
      world: player.world,
    })),
    (batch) => eventMessage(RabbitRoutingKey.SEARCH_PLAYERS_REPLAY, batch),
  );
});

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
    Effect.map(rabbitmqUriConfig, (uri) =>
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
