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

/**
 * Retries a failed handler before the delivery is settled, so later messages
 * in the queue stay behind it: 3 retries after 250 ms, 500 ms and 1 s.
 */
export const orderedHandlerRetry = Schedule.max([
  Schedule.exponential("250 millis"),
  Schedule.recurs(3),
]);

export const makeRabbitConsumer = Effect.fnUntraced(function* (
  rabbit: RabbitMessagingService,
) {
  // One shared budget leaves database connections available to HTTP requests.
  // Prefetch one also bounds waiting deliveries and preserves queue ordering.
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

        // The backoff runs outside the handler slot, leaving it to other queues.
        return inPlaceRetry
          ? attempt.pipe(Effect.retry(inPlaceRetry))
          : attempt;
      }),
      ({ cancel }) => cancel.pipe(Effect.ignore),
    );
});
