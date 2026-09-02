import { describe, expect, mock, test } from "bun:test";
import { RabbitRoutingKey } from "@lootlog/protocol/rabbit/topology";
import type { ConsumeMessage } from "amqplib";
import { Effect } from "effect";
import {
  RabbitMessaging,
  type RabbitChannel,
  type RabbitDelivery,
} from "../src/messaging.ts";

const makeMessage = (): ConsumeMessage => ({
  content: Buffer.from('{"ok":true}'),
  fields: {
    consumerTag: "consumer-1",
    deliveryTag: 1,
    redelivered: false,
    exchange: "default",
    routingKey: RabbitRoutingKey.GUILDS_LOOTS_CREATE,
  },
  properties: {
    contentType: "application/json",
    contentEncoding: undefined,
    headers: {},
    deliveryMode: 2,
    priority: undefined,
    correlationId: undefined,
    replyTo: undefined,
    expiration: undefined,
    messageId: "message-1",
    timestamp: undefined,
    type: undefined,
    userId: undefined,
    appId: undefined,
    clusterId: undefined,
  },
});

const makeChannel = () => {
  let consumer: ((message: ConsumeMessage | null) => void) | undefined;
  const ack = mock((_message: ConsumeMessage) => undefined);
  const nack = mock(
    (_message: ConsumeMessage, _allUpTo?: boolean, _requeue?: boolean) =>
      undefined,
  );
  const publish = mock(
    (
      _exchange: string,
      _routingKey: string,
      _content: Buffer,
      _options?: unknown,
    ) => true,
  );

  const channel: RabbitChannel = {
    ack,
    assertExchange: () => Promise.resolve({ exchange: "default" }),
    assertQueue: (queue) =>
      Promise.resolve({ queue, messageCount: 0, consumerCount: 0 }),
    bindQueue: () => Promise.resolve({}),
    cancel: (consumerTag) => Promise.resolve({ consumerTag }),
    close: () => Promise.resolve(),
    consume: (_queue, callback) => {
      consumer = callback;
      return Promise.resolve({ consumerTag: "consumer-1" });
    },
    nack,
    prefetch: () => Promise.resolve({}),
    publish,
    waitForConfirms: () => Promise.resolve(),
  };

  return {
    channel,
    ack,
    nack,
    publish,
    dispatch: (message: ConsumeMessage) => consumer?.(message),
  };
};

const runWithChannel = <A, E>(
  channel: RabbitChannel,
  effect: Effect.Effect<A, E, RabbitMessaging>,
) =>
  Effect.runPromise(
    effect.pipe(Effect.provide(RabbitMessaging.layerFromChannel(channel))),
  );

describe("RabbitMessaging", () => {
  test("publishes persistent messages and waits for confirmation", async () => {
    const { channel, publish } = makeChannel();

    await runWithChannel(
      channel,
      Effect.gen(function* () {
        const messaging = yield* RabbitMessaging;
        yield* messaging.publish({
          routingKey: RabbitRoutingKey.GUILDS_LOOTS_CREATE,
          content: new TextEncoder().encode('{"version":2}'),
        });
      }),
    );

    expect(publish).toHaveBeenCalledTimes(1);
    expect(publish.mock.calls[0]?.[0]).toBe("default");
    expect(publish.mock.calls[0]?.[1]).toBe("guilds.loots.create");
  });

  test("acks a successful delivery", async () => {
    const { channel, ack, dispatch } = makeChannel();

    await runWithChannel(
      channel,
      Effect.gen(function* () {
        const messaging = yield* RabbitMessaging;
        yield* messaging.consume(
          {
            queue: "test-queue",
            failurePolicy: { strategy: "requeue" },
          },
          (_delivery: RabbitDelivery) => Effect.void,
        );
        dispatch(makeMessage());
        yield* Effect.sleep(1);
      }),
    );

    expect(ack).toHaveBeenCalledTimes(1);
  });

  test("requeues a failed delivery when requested", async () => {
    const { channel, nack, dispatch } = makeChannel();

    await runWithChannel(
      channel,
      Effect.gen(function* () {
        const messaging = yield* RabbitMessaging;
        yield* messaging.consume(
          {
            queue: "test-queue",
            failurePolicy: { strategy: "requeue" },
          },
          () => Effect.fail("failed"),
        );
        dispatch(makeMessage());
        yield* Effect.sleep(1);
      }),
    );

    expect(nack).toHaveBeenCalledWith(expect.anything(), false, true);
  });

  test("dead-letters a failed delivery through broker nack", async () => {
    const { channel, nack, publish, dispatch } = makeChannel();

    await runWithChannel(
      channel,
      Effect.gen(function* () {
        const messaging = yield* RabbitMessaging;
        yield* messaging.consume(
          {
            queue: "test-queue",
            failurePolicy: { strategy: "nack" },
          },
          () => Effect.fail("failed"),
        );
        dispatch(makeMessage());
        yield* Effect.sleep(1);
      }),
    );

    expect(nack).toHaveBeenCalledWith(expect.anything(), false, false);
    expect(publish).not.toHaveBeenCalled();
  });

  test("routes failures through retry and then the dead-letter exchange", async () => {
    const { channel, ack, publish, dispatch } = makeChannel();

    await runWithChannel(
      channel,
      Effect.gen(function* () {
        const messaging = yield* RabbitMessaging;
        yield* messaging.consume(
          {
            queue: "test-queue",
            failurePolicy: {
              strategy: "retry",
              maxRetries: 1,
              retryRoutingKey: RabbitRoutingKey.GUILDS_LOOTS_CREATE_RETRY,
              deadLetterRoutingKey: RabbitRoutingKey.GUILDS_LOOTS_CREATE_DLQ,
            },
          },
          () => Effect.fail("failed"),
        );

        dispatch(makeMessage());
        yield* Effect.sleep(1);

        const exhausted = makeMessage();
        exhausted.properties.headers = { "x-lootlog-retry-count": 1 };
        dispatch(exhausted);
        yield* Effect.sleep(1);
      }),
    );

    expect(publish.mock.calls[0]?.[0]).toBe("retry");
    expect(publish.mock.calls[0]?.[1]).toBe("guilds.loots.create.retry");
    expect(publish.mock.calls[1]?.[0]).toBe("dlx");
    expect(publish.mock.calls[1]?.[1]).toBe("guilds.loots.create.dlq");
    expect(ack).toHaveBeenCalledTimes(2);
  });
});
