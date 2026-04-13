import { AmqpConnection } from "@golevelup/nestjs-rabbitmq";
import { Injectable, Logger } from "@nestjs/common";
import { GatewayConfig } from "./constants/gateway-config.constant";

interface RetryConfig {
  maxRetries?: number;
  retryDelayMs?: number;
  retryExchange?: string;
  dlqExchange?: string;
}

const DEAD_LETTER_EXCHANGE_NAME = "dlx";

@Injectable()
export class RetryService {
  private readonly logger = new Logger(RetryService.name);

  constructor(private readonly amqp: AmqpConnection) {}

  shouldRetry(
    headers: Record<string, unknown>,
    maxRetries: number = GatewayConfig.DEFAULT_MAX_RETRIES,
  ): boolean {
    const retryCount = this.getRetryCount(headers);
    return retryCount < maxRetries;
  }

  getRetryCount(headers: Record<string, unknown>): number {
    if (
      headers["x-retry-count"] &&
      typeof headers["x-retry-count"] === "number"
    ) {
      return headers["x-retry-count"];
    }

    const xDeath = headers["x-death"];
    if (Array.isArray(xDeath) && xDeath.length > 0) {
      const count = xDeath[0]?.count;
      return typeof count === "number" ? count : 0;
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

    this.logger.warn(`Sending message to DLQ: ${dlqRoutingKey}`);

    await this.amqp.publish(dlqExchange, dlqRoutingKey, message, {
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
      this.logger.warn(
        `Max retries (${maxRetries}) exceeded for ${identifier}, sending to DLQ`,
      );
      await this.sendToDlq(data, dlqRoutingKey, headers, config);
      return false;
    }

    return true;
  }
}
