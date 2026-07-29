export interface AmqpMessage {
  properties: {
    headers?: Record<string, unknown>;
  };
}

export interface RetryConfig {
  maxRetries?: number;
  retryDelayMs?: number;
  retryExchange?: string;
  dlqExchange?: string;
}

export interface RabbitMqRetryDefaults {
  maxRetries?: number;
  retryDelayMs?: number;
  retryExchange?: string;
  dlqExchange: string;
  mainExchange?: string;
}

interface AmqpPublisher {
  publish(
    exchange: string,
    routingKey: string,
    message: unknown,
    options: { headers: Record<string, unknown> },
  ): Promise<unknown>;
}

interface RetryLogger {
  info(message: string): void;
  warn(message: string): void;
}

export class RabbitMqRetryService {
  constructor(
    private readonly amqp: AmqpPublisher,
    private readonly logger: RetryLogger,
    private readonly defaults: RabbitMqRetryDefaults,
  ) {}

  shouldRetry(
    headers: Record<string, unknown>,
    maxRetries = this.defaults.maxRetries ?? 3,
  ): boolean {
    return this.getRetryCount(headers) < maxRetries;
  }

  getRetryCount(headers: Record<string, unknown>): number {
    const retryCount = headers["x-retry-count"];
    if (typeof retryCount === "number") {
      return retryCount;
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
    const dlqExchange = config.dlqExchange ?? this.defaults.dlqExchange;

    this.logger.warn(`Sending message to DLQ: ${dlqRoutingKey}`);

    await this.amqp.publish(dlqExchange, dlqRoutingKey, message, {
      headers: {
        ...headers,
        "x-final-attempt": true,
        "x-sent-to-dlq-at": new Date().toISOString(),
      },
    });
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
    const retryCount = this.getRetryCount(headers);
    const maxRetries = config.maxRetries ?? this.defaults.maxRetries ?? 3;

    if (!this.shouldRetry(headers, maxRetries)) {
      this.logger.warn(
        `Max retries (${maxRetries}) exceeded for ${identifier}, sending to DLQ`,
      );
      await this.sendToDlq(data, dlqRoutingKey, headers, config);
      return false;
    }

    this.logger.info(
      `Processing ${identifier} (attempt ${retryCount + 1}/${maxRetries})`,
    );
    return true;
  }

  handleRetryQueue(
    _data: unknown,
    amqpMessage: AmqpMessage,
    identifier: string,
    config: RetryConfig = {},
  ): void {
    const headers = amqpMessage.properties.headers ?? {};
    const currentRetryCount = this.getRetryCount(headers);
    const retryDelayMs =
      config.retryDelayMs ?? this.defaults.retryDelayMs ?? 30_000;

    this.logger.info(`[RETRY QUEUE] Processing retry for ${identifier}`);
    this.logger.info(
      `[RETRY QUEUE] Current headers: ${JSON.stringify(headers)}`,
    );
    this.logger.info(`[RETRY QUEUE] Current retry count: ${currentRetryCount}`);
    this.logger.info(`[RETRY QUEUE] TTL: ${retryDelayMs}ms`);
    this.logger.info(
      `[RETRY QUEUE] Message will expire in ${retryDelayMs}ms and return to main queue`,
    );
    this.logger.info(
      `[RETRY QUEUE] Next attempt will be #${currentRetryCount + 1}`,
    );
  }
}
