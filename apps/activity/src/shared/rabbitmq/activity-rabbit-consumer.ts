import amqp, {
  type Channel,
  type ChannelModel,
  type ConsumeMessage,
} from "amqplib";
import type { Logger } from "winston";
import { createActivitySchema } from "../../activities/schemas/create-activity.schema.js";
import type { ActivityStore } from "../../activities/activity-store.js";
import { Queue } from "../../enum/queue.enum.js";
import { RoutingKey } from "../../enum/routing-key.enum.js";

export const DEFAULT_EXCHANGE_NAME = "default";
export const DEAD_LETTER_EXCHANGE_NAME = "dlx";
export const RETRY_EXCHANGE_NAME = "retry";

type Headers = Record<string, unknown>;

export class ActivityRabbitConsumer {
  private connection: ChannelModel | null = null;
  private mainChannel: Channel | null = null;
  private dlqChannel: Channel | null = null;

  constructor(
    private readonly rabbitmqUri: string,
    private readonly activityStore: ActivityStore,
    private readonly logger: Logger,
  ) {}

  async start() {
    const connection = await amqp.connect(this.rabbitmqUri);
    const mainChannel = await connection.createChannel();
    const dlqChannel = await connection.createChannel();

    this.connection = connection;
    this.mainChannel = mainChannel;
    this.dlqChannel = dlqChannel;

    await mainChannel.prefetch(1);
    await this.setupTopology(mainChannel);
    await this.setupTopology(dlqChannel);

    await mainChannel.consume(
      Queue.ACTIVITY_LOG_CREATE,
      async (message) => {
        await this.handleActivityCreate(message);
      },
      {
        noAck: false,
      },
    );

    await dlqChannel.consume(
      Queue.ACTIVITY_LOG_CREATE_DLQ,
      async (message) => {
        await this.handleDlqMessage(message);
      },
      {
        noAck: false,
      },
    );
  }

  async close() {
    await Promise.allSettled([
      this.mainChannel?.close(),
      this.dlqChannel?.close(),
      this.connection?.close(),
    ]);
  }

  private async setupTopology(channel: amqp.Channel) {
    await channel.assertExchange(DEFAULT_EXCHANGE_NAME, "topic", {
      durable: true,
    });
    await channel.assertExchange(RETRY_EXCHANGE_NAME, "topic", {
      durable: true,
    });
    await channel.assertExchange(DEAD_LETTER_EXCHANGE_NAME, "topic", {
      durable: true,
    });

    await channel.assertQueue(Queue.ACTIVITY_LOG_CREATE, {
      durable: true,
      deadLetterExchange: RETRY_EXCHANGE_NAME,
      deadLetterRoutingKey: RoutingKey.ACTIVITY_LOG_CREATE_RETRY,
    });
    await channel.bindQueue(
      Queue.ACTIVITY_LOG_CREATE,
      DEFAULT_EXCHANGE_NAME,
      RoutingKey.ACTIVITY_LOG_CREATE,
    );

    await channel.assertQueue(Queue.ACTIVITY_LOG_CREATE_RETRY, {
      durable: true,
      messageTtl: 30000,
      deadLetterExchange: DEFAULT_EXCHANGE_NAME,
      deadLetterRoutingKey: RoutingKey.ACTIVITY_LOG_CREATE,
    });
    await channel.bindQueue(
      Queue.ACTIVITY_LOG_CREATE_RETRY,
      RETRY_EXCHANGE_NAME,
      RoutingKey.ACTIVITY_LOG_CREATE_RETRY,
    );

    await channel.assertQueue(Queue.ACTIVITY_LOG_CREATE_DLQ, {
      durable: true,
    });
    await channel.bindQueue(
      Queue.ACTIVITY_LOG_CREATE_DLQ,
      DEAD_LETTER_EXCHANGE_NAME,
      RoutingKey.ACTIVITY_LOG_CREATE_DLQ,
    );
  }

  private async handleActivityCreate(message: ConsumeMessage | null) {
    if (!message || !this.mainChannel) {
      return;
    }

    const headers = (message.properties.headers ?? {}) as Headers;
    const payload = this.parseMessageContent(message.content);

    if (payload === undefined) {
      await this.sendToDlq(
        message.content.toString("utf8"),
        RoutingKey.ACTIVITY_LOG_CREATE_DLQ,
        {
          "x-validation-error": "Malformed JSON payload",
          "x-error-type": "permanent",
        },
      );
      this.mainChannel.ack(message);
      return;
    }

    const result = createActivitySchema.safeParse(payload);

    if (!result.success) {
      this.logger.error("Invalid activity payload - sending to DLQ", {
        rawPayload: payload,
        validationErrors: result.error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
        })),
      });

      await this.sendToDlq(payload, RoutingKey.ACTIVITY_LOG_CREATE_DLQ, {
        "x-validation-error": "Validation failed",
        "x-error-type": "permanent",
      });
      this.mainChannel.ack(message);
      return;
    }

    const retryCount = this.getRetryCount(headers);

    if (retryCount >= 3) {
      this.logger.warn("Max retries exceeded for activity create", {
        guildId: result.data.guildId,
        userId: result.data.userId,
        discordId: result.data.discordId,
      });

      await this.sendToDlq(
        payload,
        RoutingKey.ACTIVITY_LOG_CREATE_DLQ,
        headers,
      );
      this.mainChannel.ack(message);
      return;
    }

    try {
      await this.activityStore.create(result.data);
      this.mainChannel.ack(message);
    } catch (error) {
      this.logger.error("Failed to create activity", {
        error: error instanceof Error ? error.message : String(error),
        guildId: result.data.guildId,
        userId: result.data.userId,
        discordId: result.data.discordId,
      });
      this.mainChannel.nack(message, false, false);
    }
  }

  private async handleDlqMessage(message: ConsumeMessage | null) {
    if (!message || !this.dlqChannel) {
      return;
    }

    const payload =
      this.parseMessageContent(message.content) ??
      message.content.toString("utf8");

    this.logger.warn(
      "Activity CREATE DLQ message - manual intervention needed",
      {
        rawPayload: payload,
      },
    );

    this.dlqChannel.ack(message);
  }

  private async sendToDlq(
    payload: unknown,
    routingKey: string,
    headers: Headers = {},
  ) {
    if (!this.mainChannel) {
      throw new Error("RabbitMQ main channel is not connected");
    }

    this.mainChannel.publish(
      DEAD_LETTER_EXCHANGE_NAME,
      routingKey,
      Buffer.from(JSON.stringify(payload)),
      {
        contentType: "application/json",
        persistent: true,
        headers: {
          ...headers,
          "x-final-attempt": true,
          "x-sent-to-dlq-at": new Date().toISOString(),
        },
      },
    );
  }

  private getRetryCount(headers: Headers) {
    if (typeof headers["x-retry-count"] === "number") {
      return headers["x-retry-count"];
    }

    const xDeath = headers["x-death"];

    if (Array.isArray(xDeath) && xDeath.length > 0) {
      const count = xDeath[0];

      if (
        typeof count === "object" &&
        count !== null &&
        "count" in count &&
        typeof count.count === "number"
      ) {
        return count.count;
      }
    }

    return 0;
  }

  private parseMessageContent(content: Buffer) {
    try {
      return JSON.parse(content.toString("utf8")) as unknown;
    } catch {
      return undefined;
    }
  }
}
