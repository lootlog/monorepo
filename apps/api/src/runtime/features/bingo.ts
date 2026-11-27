import { eventMessage, RabbitMessaging } from "@lootlog/messaging";
import { RabbitRoutingKey } from "@lootlog/protocol/rabbit/topology";
import { Effect, Layer } from "effect";
import {
  BingoData,
  BingoEvaluator,
  BingoOutboxes,
} from "#src/bingo/bingo-data";
import { makeBingoEvaluator } from "#src/bingo/bingo-evaluator";
import type { BingoPublisher } from "#src/bingo/bingo-publisher";
import { makeBingoService } from "#src/bingo/bingo.service";
import {
  bingoKillOutboxTable,
  bingoMilestoneOutboxTable,
} from "#src/database/drizzle/bingo.schema";
import { ApiDatabase } from "#src/database/drizzle/database";
import { ignorePublicationFailure } from "#src/shared/best-effort-publication";
import {
  makeOutboxDispatcher,
  makeOutboxWorker,
} from "@lootlog/database/outbox";

export const bingoServicesLive = Layer.unwrap(
  Effect.gen(function* () {
    const database = yield* ApiDatabase;
    const rabbit = yield* RabbitMessaging;

    const milestones = yield* makeOutboxWorker(
      "Bingo milestone",
      makeOutboxDispatcher(
        "BingoMilestoneOutbox",
        database,
        bingoMilestoneOutboxTable,
        (row) =>
          rabbit.publish(
            eventMessage(
              RabbitRoutingKey.NOTIFICATIONS_BINGO_MILESTONE,
              row.event,
              {
                messageId: `bingo-milestone:${row.event.eventId}`,
              },
            ),
          ),
      )(),
    );

    const publisher: BingoPublisher = {
      publishRealtimeUpdate: (event) =>
        rabbit
          .publish(eventMessage(RabbitRoutingKey.GUILDS_BINGO_UPDATED, event))
          .pipe(ignorePublicationFailure),
      signalMilestones: milestones.signal,
    };

    const evaluator = makeBingoEvaluator(database, publisher);

    const kills = yield* makeOutboxWorker(
      "Bingo kill",
      makeOutboxDispatcher(
        "BingoKillOutbox",
        database,
        bingoKillOutboxTable,
        (row) => evaluator.evaluateKill(row),
      )(),
    );

    return Layer.mergeAll(
      Layer.succeed(BingoData, makeBingoService(database, publisher)),
      Layer.succeed(BingoEvaluator, evaluator),
      Layer.succeed(BingoOutboxes, {
        runMilestones: milestones.run,
        runKills: kills.run,
        signalKills: kills.signal,
      }),
    );
  }),
);
