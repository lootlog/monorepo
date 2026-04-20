import amqplib, {
  type Channel,
  type ChannelModel,
  type ConsumeMessage,
} from "amqplib";
import type { DiscordNotificationSendCommand } from "@lootlog/types";
import { logger } from "../config/winston.config.js";

export interface EventPublisher {
  publish(
    exchange: string,
    routingKey: string,
    payload: unknown,
  ): Promise<void>;
}

interface ConsumeNotificationOptions {
  exchange: string;
  queue: string;
  routingKey: string;
  onMessage: (command: DiscordNotificationSendCommand) => Promise<void>;
}

export async function handleNotificationMessage(
  channel: Pick<Channel, "ack" | "nack">,
  message: ConsumeMessage | null,
  onMessage: ConsumeNotificationOptions["onMessage"],
) {
  if (!message) {
    return;
  }

  let parsedMessage: DiscordNotificationSendCommand;

  try {
    parsedMessage = JSON.parse(
      message.content.toString(),
    ) as DiscordNotificationSendCommand;
  } catch (error) {
    logger.error("Failed to parse Discord notification message", {
      error: error instanceof Error ? error.message : String(error),
    });
    channel.nack(message, false, false);
    return;
  }

  try {
    await onMessage(parsedMessage);
    channel.ack(message);
  } catch (error) {
    logger.error("Failed to handle Discord notification message", {
      error: error instanceof Error ? error.message : String(error),
    });
    channel.nack(message, false, true);
  }
}

export class RabbitMQClient implements EventPublisher {
  private constructor(
    private readonly connection: ChannelModel,
    private readonly channel: Channel,
  ) {}

  static async connect(uri: string) {
    const connection = await amqplib.connect(uri);
    const channel = await connection.createChannel();

    await channel.prefetch(1);

    return new RabbitMQClient(connection, channel);
  }

  async publish(exchange: string, routingKey: string, payload: unknown) {
    await this.channel.assertExchange(exchange, "topic", {
      durable: true,
    });

    this.channel.publish(
      exchange,
      routingKey,
      Buffer.from(JSON.stringify(payload)),
      {
        contentType: "application/json",
        persistent: true,
      },
    );
  }

  async consumeNotifications(options: ConsumeNotificationOptions) {
    await this.channel.assertExchange(options.exchange, "topic", {
      durable: true,
    });
    await this.channel.assertQueue(options.queue, {
      durable: true,
    });
    await this.channel.bindQueue(
      options.queue,
      options.exchange,
      options.routingKey,
    );
    await this.channel.consume(options.queue, async (message) => {
      await handleNotificationMessage(this.channel, message, options.onMessage);
    });
  }

  async close() {
    await this.channel.close();
    await this.connection.close();
  }
}
