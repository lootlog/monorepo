import {
  consumeEvent,
  type RabbitDelivery,
  type RabbitMessagingService,
} from "@lootlog/messaging";
import type {
  CanonicalRabbitEvent,
  CanonicalRabbitEventRoutingKey,
} from "@lootlog/protocol/rabbit/events";
import type { ConsumerRoute } from "@lootlog/protocol/rabbit/topology";
import { Effect, Schedule, Semaphore } from "effect";

export const orderedHandlerRetry = Schedule.max([
  Schedule.exponential("250 millis"),
  Schedule.recurs(3),
]);

export const makeRabbitConsumer = Effect.fnUntraced(function* (
  rabbit: RabbitMessagingService,
) {
  const handlerSlots = yield* Semaphore.make(5);

  return <Key extends CanonicalRabbitEventRoutingKey>(
    route: ConsumerRoute<Key>,
    handler: (
      payload: CanonicalRabbitEvent<Key>,
      delivery: RabbitDelivery,
    ) => Effect.Effect<void, unknown> | Promise<void> | void,
    inPlaceRetry?: Schedule.Schedule<unknown, unknown>,
  ) =>
    Effect.acquireRelease(
      consumeEvent(rabbit, route, (payload, delivery) => {
        const attempt = Effect.suspend(() => {
          const result = handler(payload, delivery);

          return Effect.isEffect(result)
            ? result.pipe(Effect.asVoid)
            : Effect.tryPromise({
                try: () => Promise.resolve(result),
                catch: (cause) => cause,
              });
        }).pipe(handlerSlots.withPermits(1));

        return inPlaceRetry
          ? attempt.pipe(Effect.retry(inPlaceRetry))
          : attempt;
      }),
      ({ cancel }) => cancel.pipe(Effect.ignore),
    );
});
