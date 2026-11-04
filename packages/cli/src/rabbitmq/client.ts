import amqp from "amqplib";
import type { Schema } from "effect";
import { styleText } from "node:util";

interface PublishOptions {
  exchange: string;
  routingKey: string;
  payload: typeof Schema.Json.Type;
  exchangeType?: "topic" | "direct" | "fanout";
}

class RabbitMQClient {
  private connection: amqp.ChannelModel | null = null;
  private channel: amqp.Channel | null = null;

  async connect(uri: string): Promise<void> {
    try {
      const connection = await amqp.connect(uri);
      const channel = await connection.createChannel();
      this.connection = connection;
      this.channel = channel;
    } catch (error) {
      throw new Error(
        `Failed to connect to RabbitMQ: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async publish(options: PublishOptions): Promise<void> {
    if (!this.channel) {
      throw new Error("Not connected to RabbitMQ");
    }

    const { exchange, routingKey, payload, exchangeType = "topic" } = options;

    try {
      await this.channel.assertExchange(exchange, exchangeType, {
        durable: true,
      });

      const serializedPayload = JSON.stringify(payload, null, 2);
      const message = Buffer.from(serializedPayload);

      this.channel.publish(exchange, routingKey, message, {
        contentType: "application/json",
        persistent: true,
      });

      console.log(styleText("green", "\n✓ Event published successfully!\n"));
      console.log(styleText("gray", "Exchange:"), styleText("cyan", exchange));
      console.log(
        styleText("gray", "Routing Key:"),
        styleText("cyan", routingKey),
      );
      console.log(
        styleText("gray", "Payload:\n"),
        styleText("dim", serializedPayload),
      );
      console.log();
    } catch (error) {
      throw new Error(
        `Failed to publish event: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async close(): Promise<void> {
    try {
      if (this.channel) {
        await this.channel.close();
      }

      if (this.connection) {
        await this.connection.close();
      }
    } catch {
      console.warn(
        styleText(
          "yellow",
          `Warning: Failed to close RabbitMQ connection gracefully`,
        ),
      );
    }
  }
}

export const createRabbitMQClient = async (): Promise<RabbitMQClient> => {
  const uri = process.env.RABBITMQ_URI;

  if (!uri) {
    throw new Error(
      "RABBITMQ_URI environment variable is not set. Set it in your .env file or export it, e.g. export RABBITMQ_URI=amqp://user:pass@localhost:5672",
    );
  }

  const client = new RabbitMQClient();
  await client.connect(uri);

  return client;
};
