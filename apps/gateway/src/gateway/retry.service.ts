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

  /**
   * Sprawdza czy należy wykonać retry czy wysłać do DLQ
   */
  shouldRetry(headers: Record<string, any>, maxRetries: number = 3): boolean {
    const retryCount = this.getRetryCount(headers);
    return retryCount < maxRetries;
  }

  /**
   * Pobiera aktualną liczbę prób na podstawie x-death headers
   */
  getRetryCount(headers: Record<string, any>): number {
    // Sprawdź najpierw x-retry-count (jeśli jest ustawiony manualnie)
    if (headers['x-retry-count']) {
      return headers['x-retry-count'];
    }

    // Jeśli nie ma x-retry-count, użyj x-death count
    const xDeath = headers['x-death'];
    if (Array.isArray(xDeath) && xDeath.length > 0) {
      return xDeath[0].count || 0;
    }

    return 0;
  }

  /**
   * Wysyła wiadomość do DLQ
   */
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

  /**
   * Główna metoda do obsługi retry logic w handlerach
   * Sprawdza czy robić retry czy wysłać do DLQ
   * Zwraca true jeśli handler ma kontynuować, false jeśli wiadomość została wysłana do DLQ
   */
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
      return false; // Handler powinien się zakończyć
    }

    this.logger.log(
      `Processing ${identifier} (attempt ${retryCount + 1}/${maxRetries})`,
    );
    return true; // Handler może kontynuować
  }
}
