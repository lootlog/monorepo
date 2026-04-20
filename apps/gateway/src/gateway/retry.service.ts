import { GatewayConfig } from "./constants/gateway-config.constant.js";
import { DEAD_LETTER_EXCHANGE_NAME } from "../config/rabbitmq.config.js";
import type { AmqpPublisher } from "./rabbitmq/amqp-publisher.js";

interface RetryConfig {
  maxRetries?: number;
  retryDelayMs?: number;
  retryExchange?: string;
  dlqExchange?: string;
}

export class RetryService {
  constructor(
    private readonly amqpPublisher: AmqpPublisher,
    private readonly logger: {
      warn(message: string, meta?: Record<string, unknown>): void;
    },
  ) {}

  shouldRetry(
    headers: Record<string, unknown>,
    maxRetries: number = GatewayConfig.DEFAULT_MAX_RETRIES,
  ): boolean {
    const retryCount = this.getRetryCount(headers);
    return retryCount < maxRetries;
  }

  getRetryCount(headers: Record<string, unknown>): number {
    if (headers["x-retry-count"]) {
      return headers["x-retry-count"] as number;
    }

    const xDeath = headers["x-death"];
    if (Array.isArray(xDeath) && xDeath.length > 0) {
      return (xDeath[0].count as number) ?? 0;
    }

    return 0;
  }

  async sendToDlq(
    message: unknown,
    dlqRoutingKey: string,
    headers: Record<string, unknown> = {},
    config: RetryConfig = {},
  ): Promise<void> {
    const dlqExchange = config.dlqExchange ?? DEAD_LETTER_EXCHANGE_NAME;

    this.logger.warn("Sending message to DLQ", { dlqRoutingKey });

    await this.amqpPublisher.publish(dlqExchange, dlqRoutingKey, message, {
      headers: {
        ...headers,
        "x-final-attempt": true,
        "x-sent-to-dlq-at": new Date().toISOString(),
      },
    });
  }

  async handleRetryLogic(
    data: unknown,
    headers: Record<string, unknown>,
    dlqRoutingKey: string,
    identifier: string,
    config: RetryConfig = {},
  ): Promise<boolean> {
    const maxRetries = config.maxRetries ?? GatewayConfig.DEFAULT_MAX_RETRIES;

    if (!this.shouldRetry(headers, maxRetries)) {
      this.logger.warn("Retry limit exceeded, forwarding message to DLQ", {
        identifier,
        maxRetries,
      });
      await this.sendToDlq(data, dlqRoutingKey, headers, config);
      return false;
    }

    return true;
  }
}
