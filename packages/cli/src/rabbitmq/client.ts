import amqp from "amqplib";
import { chalk } from "zx";

interface PublishOptions {
  exchange: string;
  routingKey: string;
  payload: Record<string, unknown>;
  exchangeType?: "topic" | "direct" | "fanout";
}

class RabbitMQClient {
  private connection: amqp.Connection | null = null;
  private channel: amqp.Channel | null = null;

  async connect(uri: string): Promise<void> {
    try {
      this.connection = await amqp.connect(uri);
      this.channel = await this.connection.createChannel();
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

      const message = Buffer.from(JSON.stringify(payload, null, 2));

      this.channel.publish(exchange, routingKey, message, {
        contentType: "application/json",
        persistent: true,
      });

      console.log(chalk.green("\n✓ Event published successfully!\n"));
      console.log(chalk.gray("Exchange:"), chalk.cyan(exchange));
      console.log(chalk.gray("Routing Key:"), chalk.cyan(routingKey));
      console.log(
        chalk.gray("Payload:\n"),
        chalk.dim(JSON.stringify(payload, null, 2)),
      );
      console.log();
    } catch (error) {
      throw new Error(
        `Failed to publish event: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  isConnected(): boolean {
    return this.connection !== null && this.channel !== null;
  }

  async close(): Promise<void> {
    try {
      if (this.channel) {
        await this.channel.close();
      }
      if (this.connection) {
        await this.connection.close();
      }
    } catch (error) {
      console.warn(
        chalk.yellow(`Warning: Failed to close RabbitMQ connection gracefully`),
      );
    }
  }
}

export const createRabbitMQClient = async (): Promise<RabbitMQClient> => {
  const uri = process.env.RABBITMQ_URI;

  if (!uri) {
    console.error(
      chalk.red("\n❌ Error: RABBITMQ_URI environment variable is not set\n"),
    );
    console.log(
      chalk.gray("Please set RABBITMQ_URI in your .env file or export it:\n"),
    );
    console.log(
      chalk.cyan("  export RABBITMQ_URI=amqp://user:pass@localhost:5672\n"),
    );
    process.exit(1);
  }

  const client = new RabbitMQClient();
  await client.connect(uri);
  return client;
};
