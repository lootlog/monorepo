import { eventMessage, RabbitMessaging } from "@lootlog/messaging";
import { RabbitRoutingKey } from "@lootlog/protocol/rabbit/topology";
import { Effect, Layer } from "effect";
import { BingoData, BingoEvaluator } from "#src/bingo/bingo-data";
import { makeBingoEvaluator } from "#src/bingo/bingo-evaluator";
import type { BingoPublisher } from "#src/bingo/bingo-publisher";
import { makeBingoService } from "#src/bingo/bingo.service";
import { ApiDatabase } from "#src/database/drizzle/database";
import { ignorePublicationFailure } from "#src/shared/best-effort-publication";

const makeRabbitBingoPublisher = (
  rabbit: RabbitMessaging["Service"],
): BingoPublisher => ({
  publishRealtimeUpdate: (event) =>
    rabbit
      .publish(eventMessage(RabbitRoutingKey.GUILDS_BINGO_UPDATED, event))
      .pipe(ignorePublicationFailure),
  publishMilestoneNotification: (event) =>
    rabbit
      .publish(
        eventMessage(RabbitRoutingKey.NOTIFICATIONS_BINGO_MILESTONE, event, {
          messageId: `bingo-milestone:${event.eventId}`,
        }),
      )
      .pipe(ignorePublicationFailure),
});

export const bingoServicesLive = Layer.unwrap(
  Effect.gen(function* () {
    const database = yield* ApiDatabase;
    const rabbit = yield* RabbitMessaging;
    const publisher = makeRabbitBingoPublisher(rabbit);

    return Layer.mergeAll(
      Layer.succeed(BingoData, makeBingoService(database, publisher)),
      Layer.succeed(BingoEvaluator, makeBingoEvaluator(database, publisher)),
    );
  }),
);
