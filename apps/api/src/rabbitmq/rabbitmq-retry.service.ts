import type { AmqpPublisher } from "./amqp-publisher.js";

export interface AmqpMessage {
  properties: { headers?: Record<string, unknown> };
}

export interface RetryConfig {
  maxRetries?: number;
  retryDelayMs?: number;
  retryExchange?: string;
  dlqExchange?: string;
}

interface RetryDefaults extends RetryConfig {
  dlqExchange: string;
  mainExchange?: string;
}

interface RetryLogger {
  info(message: string): void;
  warn(message: string): void;
}

export class RabbitMqRetryService {
  constructor(
    private readonly amqp: AmqpPublisher,
    private readonly logger: RetryLogger,
    private readonly defaults: RetryDefaults,
  ) {}

  getRetryCount(headers: Record<string, unknown>): number {
    const retryCount = headers["x-retry-count"];
    if (typeof retryCount === "number") return retryCount;

    const deaths = headers["x-death"];
    if (!Array.isArray(deaths) || deaths.length === 0) return 0;
    const count = (deaths[0] as { count?: unknown } | undefined)?.count;
    return typeof count === "number" ? count : 0;
  }

  shouldRetry(
    headers: Record<string, unknown>,
    maxRetries = this.defaults.maxRetries ?? 3,
  ): boolean {
    return this.getRetryCount(headers) < maxRetries;
  }

  async sendToDlq(
    message: unknown,
    routingKey: string,
    headers: Record<string, unknown> = {},
    config: RetryConfig = {},
  ): Promise<void> {
    this.logger.warn(`Sending message to DLQ: ${routingKey}`);
    await this.amqp.publish(
      config.dlqExchange ?? this.defaults.dlqExchange,
      routingKey,
      message,
      {
        headers: {
          ...headers,
          "x-final-attempt": true,
          "x-sent-to-dlq-at": new Date().toISOString(),
        },
      },
    );
  }

  getRetryQueueOptions(
    mainRoutingKey: string,
    retryDelayMs = this.defaults.retryDelayMs ?? 30_000,
  ) {
    return {
      durable: true,
      messageTtl: retryDelayMs,
      deadLetterExchange: this.defaults.mainExchange,
      deadLetterRoutingKey: mainRoutingKey,
    };
  }

  getMainQueueOptions(retryRoutingKey: string, config: RetryConfig = {}) {
    return {
      durable: true,
      deadLetterExchange: config.retryExchange ?? this.defaults.retryExchange,
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
    const maxRetries = config.maxRetries ?? this.defaults.maxRetries ?? 3;
    if (!this.shouldRetry(headers, maxRetries)) {
      this.logger.warn(
        `Max retries (${maxRetries}) exceeded for ${identifier}, sending to DLQ`,
      );
      await this.sendToDlq(data, dlqRoutingKey, headers, config);
      return false;
    }

    const attempt = this.getRetryCount(headers) + 1;
    this.logger.info(
      `Processing ${identifier} (attempt ${attempt}/${maxRetries})`,
    );
    return true;
  }

  handleRetryQueue(
    _data: unknown,
    message: AmqpMessage,
    identifier: string,
    config: RetryConfig = {},
  ): void {
    const headers = message.properties.headers ?? {};
    const retryCount = this.getRetryCount(headers);
    const retryDelayMs =
      config.retryDelayMs ?? this.defaults.retryDelayMs ?? 30_000;
    this.logger.info(
      `[RETRY QUEUE] Processing retry for ${identifier}; current=${retryCount}; ttl=${retryDelayMs}ms; next=${retryCount + 1}`,
    );
  }
}
