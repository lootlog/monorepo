import {
  RabbitExchange,
  type RabbitExchangeName,
  type RabbitQueueDefinition,
  type RabbitRoutingKeyName,
} from "@lootlog/protocol/rabbit/topology";
import amqp, {
  type ConfirmChannel,
  type ConsumeMessage,
  type Options,
} from "amqplib";
import { Context, Effect, Layer, Schema } from "effect";

// oxlint-disable-next-line unicorn/throw-new-error -- Effect TaggedError is a class factory.
export class MessagingError extends Schema.TaggedError<MessagingError>()(
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
  ) => Effect.Effect<RabbitConsumer, MessagingError>;
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

const makeService = (channel: RabbitChannel): RabbitMessagingService => {
  const publish = Effect.fn("RabbitMessaging.publish")(
    (options: PublishOptions) =>
      Effect.tryPromise({
        try: async () => {
          const accepted = channel.publish(
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
          if (!accepted) {
            await Promise.resolve();
          }
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
    if (options.prefetch !== undefined) {
      const prefetch = options.prefetch;
      yield* Effect.tryPromise({
        try: () => channel.prefetch(prefetch),
        catch: (cause) => error("consume", cause),
      });
    }

    const result = yield* Effect.tryPromise({
      try: () =>
        channel.consume(
          options.queue,
          (message) => {
            if (message === null) return;
            const delivery = toDelivery(message);
            Effect.runFork(
              handler(delivery).pipe(
                Effect.matchEffect({
                  onFailure: () =>
                    routeFailure(delivery, options.failurePolicy),
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
    });

    return {
      consumerTag: result.consumerTag,
      cancel: Effect.tryPromise({
        try: () => channel.cancel(result.consumerTag),
        catch: (cause) => error("cancel", cause),
      }).pipe(Effect.asVoid),
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
  ): Layer.Layer<RabbitMessaging, MessagingError> {
    return Layer.effect(
      RabbitMessaging,
      Effect.gen(function* () {
        const connection = yield* Effect.acquireRelease(
          Effect.tryPromise({
            try: () =>
              amqp.connect(config.uri, {
                clientProperties: config.connectionName
                  ? { connection_name: config.connectionName }
                  : undefined,
              }),
            catch: (cause) => error("connect", cause),
          }),
          (activeConnection) =>
            Effect.tryPromise({
              try: () => activeConnection.close(),
              catch: (cause) => error("close", cause),
            }).pipe(Effect.ignore),
        );

        const channel = yield* Effect.acquireRelease(
          Effect.tryPromise({
            try: () => connection.createConfirmChannel(),
            catch: (cause) => error("connect", cause),
          }),
          (activeChannel) =>
            Effect.tryPromise({
              try: () => activeChannel.close(),
              catch: (cause) => error("close", cause),
            }).pipe(Effect.ignore),
        );

        yield* installTopology(channel, config.queues ?? []);
        return RabbitMessaging.of(makeService(channel));
      }),
    );
  }

  static layerFromChannel(
    channel: RabbitChannel,
  ): Layer.Layer<RabbitMessaging> {
    return Layer.succeed(
      RabbitMessaging,
      RabbitMessaging.of(makeService(channel)),
    );
  }
}
