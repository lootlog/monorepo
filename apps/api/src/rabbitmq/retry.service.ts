import type { AmqpPublisher } from "#src/rabbitmq/amqp-publisher";
import { RabbitMqRetryService } from "./rabbitmq-retry.service.js";

import type { ApplicationLogger as Logger } from "#src/shared/logging/application-logger";
import {
  DEAD_LETTER_EXCHANGE_NAME,
  DEFAULT_EXCHANGE_NAME,
  RETRY_EXCHANGE_NAME,
} from "#src/config/rabbitmq.config";

export class RetryService extends RabbitMqRetryService {
  constructor(logger: Logger, amqp: AmqpPublisher) {
    super(
      amqp,
      {
        info: (message) => logger.log({ level: "info", message }),
        warn: (message) => logger.log({ level: "warn", message }),
      },
      {
        dlqExchange: DEAD_LETTER_EXCHANGE_NAME,
        mainExchange: DEFAULT_EXCHANGE_NAME,
        maxRetries: 3,
        retryDelayMs: 30_000,
        retryExchange: RETRY_EXCHANGE_NAME,
      },
    );
  }
}
