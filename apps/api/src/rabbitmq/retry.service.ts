import { AmqpConnection } from "@golevelup/nestjs-rabbitmq";
import { Inject, Injectable } from "@nestjs/common";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import type { Logger } from "winston";
import {
  DEAD_LETTER_EXCHANGE_NAME,
  DEFAULT_EXCHANGE_NAME,
  RETRY_EXCHANGE_NAME,
} from "src/config/rabbitmq.config";

export interface RetryConfig {
  maxRetries?: number;
  retryDelayMs?: number;
  retryExchange?: string;
  dlqExchange?: string;
}

@Injectable()
export class RetryService {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    private readonly amqp: AmqpConnection,
  ) {}

  shouldRetry(
    headers: Record<string, unknown>,
    maxRetries: number = 3,
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
    const dlqExchange = config.dlqExchange || DEAD_LETTER_EXCHANGE_NAME;

    this.logger.log({
      level: "warn",
      message: `Sending message to DLQ: ${dlqRoutingKey}`,
    });

    await this.amqp.publish(dlqExchange, dlqRoutingKey, message, {
      headers: {
        ...headers,
        "x-final-attempt": true,
        "x-sent-to-dlq-at": new Date().toISOString(),
      },
    });
  }

  getRetryQueueOptions(mainRoutingKey: string, retryDelayMs: number = 30000) {
    const mainExchange = DEFAULT_EXCHANGE_NAME;

    return {
      durable: true,
      messageTtl: retryDelayMs,
      deadLetterExchange: mainExchange,
      deadLetterRoutingKey: mainRoutingKey,
    };
  }

  getMainQueueOptions(retryRoutingKey: string, config: RetryConfig = {}) {
    return {
      durable: true,
      deadLetterExchange: config.retryExchange || RETRY_EXCHANGE_NAME,
      deadLetterRoutingKey: retryRoutingKey,
    };
  }

  async handleRetryLogic(
    data: unknown,
    headers: Record<string, unknown>,
    dlqRoutingKey: string,
    identifier: string,
    config: RetryConfig = {},
  ): Promise<boolean> {
    const retryCount = this.getRetryCount(headers);
    const maxRetries = config.maxRetries || 3;

    if (!this.shouldRetry(headers, maxRetries)) {
      this.logger.log({
        level: "warn",
        message: `Max retries (${maxRetries}) exceeded for ${identifier}, sending to DLQ`,
      });
      await this.sendToDlq(data, dlqRoutingKey, headers, config);
      return false;
    }

    this.logger.log({
      level: "info",
      message: `Processing ${identifier} (attempt ${retryCount + 1}/${maxRetries})`,
    });
    return true;
  }
}
