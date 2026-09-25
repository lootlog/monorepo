import {
  UnprocessableDelivery,
  type FailurePolicy,
  type RabbitDelivery,
  type RabbitMessagingService,
} from "@lootlog/messaging";
import {
  decodeRabbitEventJson,
  type CanonicalRabbitEvent,
  type CanonicalRabbitEventRoutingKey,
} from "@lootlog/protocol/rabbit/events";
import { Effect, Semaphore } from "effect";

export const makeRabbitConsumer = Effect.fnUntraced(function* (
  rabbit: RabbitMessagingService,
) {
  // One shared budget leaves database connections available to HTTP requests.
  // Prefetch one also bounds waiting deliveries and preserves queue ordering.
  const handlerSlots = yield* Semaphore.make(5);

  return <Key extends CanonicalRabbitEventRoutingKey>(
    queue: string,
    routingKey: Key,
    handler: (
      payload: CanonicalRabbitEvent<Key>,
      delivery: RabbitDelivery,
    ) => Effect.Effect<unknown, unknown> | Promise<void> | void,
    failurePolicy: FailurePolicy = { strategy: "nack" },
  ) =>
    Effect.acquireRelease(
      rabbit.consume({ queue, prefetch: 1, failurePolicy }, (delivery) =>
        Effect.try({
          try: () =>
            decodeRabbitEventJson(
              routingKey,
              new TextDecoder().decode(delivery.content),
            ),
          // A payload that does not decode now will never decode on retry.
          catch: (cause) => new UnprocessableDelivery({ cause }),
        }).pipe(
          Effect.tapError(() =>
            Effect.logError("RabbitMQ delivery payload is invalid").pipe(
              Effect.annotateLogs({ queue, routingKey }),
            ),
          ),
          Effect.flatMap((payload) => {
            const result = handler(payload, delivery);

            return Effect.isEffect(result)
              ? result.pipe(Effect.asVoid)
              : Effect.tryPromise({
                  try: () => Promise.resolve(result),
                  catch: (cause) => cause,
                });
          }),
          handlerSlots.withPermits(1),
        ),
      ),
      ({ cancel }) => cancel.pipe(Effect.ignore),
    );
});
