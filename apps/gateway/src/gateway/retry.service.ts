import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import { Injectable, Logger } from '@nestjs/common';

export interface RetryConfig {
  maxRetries?: number;
  retryDelayMs?: number;
  retryExchange?: string;
  dlqExchange?: string;
}

const DEFAULT_EXCHANGE_NAME = 'default';
const DEAD_LETTER_EXCHANGE_NAME = 'dlx';
const RETRY_EXCHANGE_NAME = 'retry';

@Injectable()
export class RetryService {
  private readonly logger = new Logger(RetryService.name);

  constructor(private readonly amqp: AmqpConnection) {}

  shouldRetry(headers: Record<string, any>, maxRetries: number = 3): boolean {
    const retryCount = this.getRetryCount(headers);
    return retryCount < maxRetries;
  }

  getRetryCount(headers: Record<string, any>): number {
    if (headers['x-retry-count']) {
      return headers['x-retry-count'];
    }

    const xDeath = headers['x-death'];
    if (Array.isArray(xDeath) && xDeath.length > 0) {
      return xDeath[0].count || 0;
    }

    return 0;
  }

  async sendToDlq(
    message: any,
    dlqRoutingKey: string,
    headers: Record<string, any> = {},
    config: RetryConfig = {},
  ): Promise<void> {
    const dlqExchange = config.dlqExchange || DEAD_LETTER_EXCHANGE_NAME;

    this.logger.warn(`Sending message to DLQ: ${dlqRoutingKey}`);

    await this.amqp.publish(dlqExchange, dlqRoutingKey, message, {
      headers: {
        ...headers,
        'x-final-attempt': true,
        'x-sent-to-dlq-at': new Date().toISOString(),
      },
    });
  }

  async handleRetryLogic(
    data: any,
    headers: Record<string, any>,
    dlqRoutingKey: string,
    identifier: string,
    config: RetryConfig = {},
  ): Promise<boolean> {
    const retryCount = this.getRetryCount(headers);
    const maxRetries = config.maxRetries || 3;

    if (!this.shouldRetry(headers, maxRetries)) {
      this.logger.warn(
        `Max retries (${maxRetries}) exceeded for ${identifier}, sending to DLQ`,
      );
      await this.sendToDlq(data, dlqRoutingKey, headers, config);
      return false;
    }

    this.logger.log(
      `Processing ${identifier} (attempt ${retryCount + 1}/${maxRetries})`,
    );
    return true;
  }
}
