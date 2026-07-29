import { AmqpConnection } from "@golevelup/nestjs-rabbitmq";
import { RabbitMqRetryService } from "@lootlog/nest-shared/rabbitmq";
import { Inject, Injectable } from "@nestjs/common";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import type { Logger } from "winston";
import {
  DEAD_LETTER_EXCHANGE_NAME,
  DEFAULT_EXCHANGE_NAME,
  RETRY_EXCHANGE_NAME,
} from "src/config/rabbitmq.config";

@Injectable()
export class RetryService extends RabbitMqRetryService {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) logger: Logger,
    amqp: AmqpConnection,
  ) {
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
