import { TaggedError as TaggedErrorClass } from "effect/Schema";
import {
  RabbitExchange,
  type RabbitExchangeName,
  type RabbitQueueDefinition,
  type RabbitRoutingKeyName,
} from "@lootlog/protocol/rabbit/topology";
import type { EventEmitter } from "node:events";
import amqp, {
  type ConfirmChannel,
  type ConsumeMessage,
  type Options,
} from "amqplib";
import {
  Cause,
  Context,
  Deferred,
  Effect,
  FiberSet,
  Layer,
  Metric,
  Schedule,
  Schema,
  Semaphore,
  type Scope,
} from "effect";

export class MessagingError extends TaggedErrorClass<MessagingError>()(
  "MessagingError",
  {
    operation: Schema.Literals([
      "ack",
      "cancel",
      "close",
      "connect",
      "consume",
      "nack",
      "publish",
      "topology",
    ]),
    message: Schema.String,
    cause: Schema.Defect(),
  },
) {}

class RabbitConnectionFailure extends Context.Service<
  RabbitConnectionFailure,
  (cause: unknown) => void
>()("@lootlog/messaging/ConnectionFailure") {}

const acquireBrokerResource = <
  A extends EventEmitter & { close(): Promise<void> },
>(
  acquire: () => Promise<A>,
) =>
  Effect.gen(function* () {
    const fail = yield* RabbitConnectionFailure;
    let closing = false;
    const onError = (cause: unknown) => {
      if (!closing) fail(cause);
    };
    const onClose = () =>
      onError(new Error("RabbitMQ connection or channel closed"));
    return yield* Effect.acquireRelease(
      Effect.tryPromise({
        try: async () => {
          const resource = await acquire();
          resource.on("error", onError);
          resource.on("close", onClose);
          return resource;
        },
        catch: (cause) => error("connect", cause),
      }),
      (resource) =>
        Effect.promise(async () => {
          closing = true;
          try {
            await resource.close();
          } catch {
            /* Already closed by the broker. */
          } finally {
            resource.off("error", onError);
            resource.off("close", onClose);
          }
        }),
    );
  });

export interface RabbitDelivery {
  readonly content: Uint8Array;
  readonly exchange: string;
  readonly routingKey: string;
  readonly redelivered: boolean;
  readonly properties: ConsumeMessage["properties"];
  readonly raw: ConsumeMessage;
}

export interface PublishOptions {
  readonly exchange?: RabbitExchangeName;
  readonly routingKey: RabbitRoutingKeyName;
  readonly content: Uint8Array;
  readonly contentType?: string;
  readonly headers?: Readonly<Record<string, unknown>>;
  readonly messageId?: string;
  readonly persistent?: boolean;
}

export type FailurePolicy =
  | { readonly strategy: "nack" }
  | { readonly strategy: "requeue" }
  | {
      readonly strategy: "retry";
      readonly maxRetries: number;
      readonly retryRoutingKey: RabbitRoutingKeyName;
      readonly deadLetterRoutingKey: RabbitRoutingKeyName;
    }
  | {
      readonly strategy: "dead-letter";
      readonly deadLetterRoutingKey: RabbitRoutingKeyName;
    };

export interface ConsumeOptions {
  readonly queue: string;
  readonly consumerTag?: string;
  readonly prefetch?: number;
  readonly failurePolicy: FailurePolicy;
}

export interface RabbitConsumer {
  readonly consumerTag: string;
  readonly cancel: Effect.Effect<void, MessagingError>;
}

export interface RabbitChannel {
  readonly ack: (message: ConsumeMessage) => void;
  readonly assertExchange: ConfirmChannel["assertExchange"];
  readonly assertQueue: ConfirmChannel["assertQueue"];
  readonly bindQueue: ConfirmChannel["bindQueue"];
  readonly cancel: ConfirmChannel["cancel"];
  readonly close: ConfirmChannel["close"];
  readonly consume: ConfirmChannel["consume"];
  readonly nack: (
    message: ConsumeMessage,
    allUpTo?: boolean,
    requeue?: boolean,
  ) => void;
  readonly prefetch: ConfirmChannel["prefetch"];
  readonly publish: ConfirmChannel["publish"];
  readonly waitForConfirms: ConfirmChannel["waitForConfirms"];
}

export interface RabbitMessagingService {
  readonly publish: (
    options: PublishOptions,
  ) => Effect.Effect<void, MessagingError>;
  readonly consume: <E>(
    options: ConsumeOptions,
    handler: (delivery: RabbitDelivery) => Effect.Effect<void, E>,
  ) => Effect.Effect<RabbitConsumer, MessagingError, Scope.Scope>;
  readonly ack: (
    delivery: RabbitDelivery,
  ) => Effect.Effect<void, MessagingError>;
  readonly nack: (
    delivery: RabbitDelivery,
    options?: { readonly requeue?: boolean },
  ) => Effect.Effect<void, MessagingError>;
}

export interface RabbitMessagingConfig {
  readonly uri: string;
  readonly connectionName?: string;
  readonly queues?: ReadonlyArray<RabbitQueueDefinition>;
}

const error = (
  operation: MessagingError["operation"],
  cause: unknown,
): MessagingError =>
  new MessagingError({
    operation,
    message: cause instanceof Error ? cause.message : String(cause),
    cause,
  });

const toDelivery = (message: ConsumeMessage): RabbitDelivery => ({
  content: new Uint8Array(message.content),
  exchange: message.fields.exchange,
  routingKey: message.fields.routingKey,
  redelivered: message.fields.redelivered,
  properties: message.properties,
  raw: message,
});

const readRetryCount = (message: ConsumeMessage): number => {
  const value = message.properties.headers?.["x-lootlog-retry-count"];
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0
    ? value
    : 0;
};

const makeService = (
  channel: RabbitChannel,
  consumerCancelled: (queue: string) => void,
): RabbitMessagingService => {
  const publish = Effect.fn("RabbitMessaging.publish")(
    (options: PublishOptions) =>
      Effect.tryPromise({
        try: async () => {
          channel.publish(
            options.exchange ?? RabbitExchange.DEFAULT,
            options.routingKey,
            Buffer.from(options.content),
            {
              contentType: options.contentType ?? "application/json",
              headers: options.headers,
              messageId: options.messageId,
              persistent: options.persistent ?? true,
            },
          );
          await channel.waitForConfirms();
        },
        catch: (cause) => error("publish", cause),
      }),
  );

  const ack = (delivery: RabbitDelivery): Effect.Effect<void, MessagingError> =>
    Effect.try({
      try: () => channel.ack(delivery.raw),
      catch: (cause) => error("ack", cause),
    });

  const nack = (
    delivery: RabbitDelivery,
    options?: { readonly requeue?: boolean },
  ): Effect.Effect<void, MessagingError> =>
    Effect.try({
      try: () => channel.nack(delivery.raw, false, options?.requeue ?? false),
      catch: (cause) => error("nack", cause),
    });

  const routeFailure = (
    delivery: RabbitDelivery,
    policy: FailurePolicy,
  ): Effect.Effect<void, MessagingError> => {
    if (policy.strategy === "nack") {
      return nack(delivery, { requeue: false });
    }

    if (policy.strategy === "requeue") {
      return nack(delivery, { requeue: true });
    }

    const currentRetryCount = readRetryCount(delivery.raw);
    const shouldRetry =
      policy.strategy === "retry" && currentRetryCount < policy.maxRetries;
    const exchange = shouldRetry
      ? RabbitExchange.RETRY
      : RabbitExchange.DEAD_LETTER;
    const routingKey = shouldRetry
      ? policy.retryRoutingKey
      : policy.deadLetterRoutingKey;

    return publish({
      exchange,
      routingKey,
      content: delivery.content,
      contentType: delivery.properties.contentType ?? undefined,
      messageId: delivery.properties.messageId ?? undefined,
      headers: {
        ...delivery.properties.headers,
        "x-lootlog-retry-count": currentRetryCount + 1,
        "x-lootlog-original-exchange": delivery.exchange,
        "x-lootlog-original-routing-key": delivery.routingKey,
      },
      persistent: delivery.properties.deliveryMode === 2,
    }).pipe(
      Effect.andThen(ack(delivery)),
      Effect.catch((publishError) =>
        nack(delivery, { requeue: true }).pipe(
          Effect.andThen(Effect.fail(publishError)),
        ),
      ),
    );
  };

  const consume: RabbitMessagingService["consume"] = Effect.fn(
    "RabbitMessaging.consume",
  )(function* <E>(
    options: ConsumeOptions,
    handler: (delivery: RabbitDelivery) => Effect.Effect<void, E>,
  ) {
    const deliveries = yield* FiberSet.make<void, never>();
    const runDelivery = yield* FiberSet.runtime(deliveries)<never>();

    if (options.prefetch !== undefined) {
      const prefetch = options.prefetch;
      yield* Effect.tryPromise({
        try: () => channel.prefetch(prefetch),
        catch: (cause) => error("consume", cause),
      });
    }

    const cancellation = yield* Semaphore.make(1);
    let cancelled = false;
    const cancel = (consumerTag: string) =>
      cancellation
        .withPermits(1)(
          Effect.suspend(() => {
            if (cancelled) return Effect.void;
            return Effect.tryPromise({
              try: () => channel.cancel(consumerTag),
              catch: (cause) => error("cancel", cause),
            }).pipe(
              Effect.tap(() =>
                Effect.sync(() => {
                  cancelled = true;
                }),
              ),
              Effect.ensuring(FiberSet.clear(deliveries)),
              Effect.asVoid,
            );
          }),
        )
        .pipe(Effect.uninterruptible);
    const result = yield* Effect.acquireRelease(
      Effect.tryPromise({
        try: () =>
          channel.consume(
            options.queue,
            (message) => {
              if (message === null) {
                consumerCancelled(options.queue);
                return;
              }
              const delivery = toDelivery(message);
              runDelivery(
                Effect.suspend(() => handler(delivery)).pipe(
                  Effect.onInterrupt(() =>
                    nack(delivery, { requeue: true }).pipe(Effect.ignore),
                  ),
                  Effect.matchCauseEffect({
                    onFailure: (cause) =>
                      Cause.hasInterruptsOnly(cause)
                        ? Effect.interrupt
                        : routeFailure(delivery, options.failurePolicy),
                    onSuccess: () => ack(delivery),
                  }),
                  Effect.catch((error) =>
                    Effect.logError("RabbitMQ delivery handling failed", error),
                  ),
                ),
              );
            },
            { consumerTag: options.consumerTag, noAck: false },
          ),
        catch: (cause) => error("consume", cause),
      }),
      (consumer) => cancel(consumer.consumerTag).pipe(Effect.ignore),
    );
    return {
      consumerTag: result.consumerTag,
      cancel: cancel(result.consumerTag),
    };
  });

  return { publish, consume, ack, nack };
};

const installTopology = (
  channel: RabbitChannel,
  queues: ReadonlyArray<RabbitQueueDefinition>,
): Effect.Effect<void, MessagingError> =>
  Effect.tryPromise({
    try: async () => {
      await Promise.all(
        Object.values(RabbitExchange).map((exchange) =>
          channel.assertExchange(exchange, "topic", { durable: true }),
        ),
      );

      await Promise.all(
        queues.map(async (queue) => {
          const queueOptions: Options.AssertQueue = {
            durable: queue.durable,
            messageTtl: queue.messageTtl,
            deadLetterExchange: queue.deadLetterExchange,
            deadLetterRoutingKey: queue.deadLetterRoutingKey,
          };
          await channel.assertQueue(queue.name, queueOptions);
          await channel.bindQueue(queue.name, queue.exchange, queue.routingKey);
        }),
      );
    },
    catch: (cause) => error("topology", cause),
  });

export class RabbitMessaging extends Context.Service<
  RabbitMessaging,
  RabbitMessagingService
>()("@lootlog/messaging/RabbitMessaging") {
  static layer(
    config: RabbitMessagingConfig,
  ): Layer.Layer<RabbitMessaging, MessagingError, RabbitConnectionFailure> {
    return Layer.effect(
      RabbitMessaging,
      Effect.gen(function* () {
        const connection = yield* acquireBrokerResource(() =>
          amqp.connect(config.uri, {
            clientProperties: config.connectionName
              ? { connection_name: config.connectionName }
              : undefined,
          }),
        );
        const channel = yield* acquireBrokerResource(() =>
          connection.createConfirmChannel(),
        );

        yield* installTopology(channel, config.queues ?? []);
        const deadLetterQueues = (config.queues ?? []).filter(
          (queue) => queue.exchange === RabbitExchange.DEAD_LETTER,
        );
        if (deadLetterQueues.length > 0) {
          yield* Effect.forEach(
            deadLetterQueues,
            (queue) =>
              Effect.tryPromise(() => channel.checkQueue(queue.name)).pipe(
                Effect.flatMap(({ messageCount }) =>
                  Metric.update(
                    Metric.gauge("rabbitmq.dead_letter.messages").pipe(
                      Metric.withAttributes({ queue: queue.name }),
                    ),
                    messageCount,
                  ),
                ),
              ),
            { discard: true },
          ).pipe(
            Effect.catch((error) =>
              Effect.logWarning(
                "Unable to inspect RabbitMQ dead-letter queue depth",
                error,
              ),
            ),
            Effect.repeat(Schedule.spaced("30 seconds")),
            Effect.forkScoped,
          );
        }

        const fail = yield* RabbitConnectionFailure;
        return RabbitMessaging.of(
          makeService(channel, (queue) =>
            fail(new Error(`RabbitMQ consumer cancelled by broker: ${queue}`)),
          ),
        );
      }),
    );
  }

  /** Fail the application and close its scopes when an established broker connection dies. */
  static supervised<A, E, R>(
    application: Effect.Effect<A, E, R | RabbitConnectionFailure>,
  ): Effect.Effect<A, E | MessagingError, Exclude<R, RabbitConnectionFailure>> {
    return Effect.gen(function* () {
      const failure = yield* Deferred.make<never, MessagingError>();
      return yield* Effect.raceFirst(
        application.pipe(
          Effect.provideService(RabbitConnectionFailure, (cause) => {
            Deferred.doneUnsafe(failure, Effect.fail(error("connect", cause)));
          }),
        ),
        Deferred.await(failure),
      );
    });
  }

  static layerFromChannel(
    channel: RabbitChannel,
  ): Layer.Layer<RabbitMessaging> {
    return Layer.succeed(
      RabbitMessaging,
      RabbitMessaging.of(makeService(channel, () => undefined)),
    );
  }
}
