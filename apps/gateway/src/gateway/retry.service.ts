import { AmqpConnection } from "@golevelup/nestjs-rabbitmq";
import { RabbitMqRetryService } from "@lootlog/nest-shared/rabbitmq";
import { Injectable, Logger } from "@nestjs/common";
import { GatewayConfig } from "./constants/gateway-config.constant.js";

const DEAD_LETTER_EXCHANGE_NAME = "dlx";

@Injectable()
export class RetryService extends RabbitMqRetryService {
  constructor(amqp: AmqpConnection) {
    const logger = new Logger(RetryService.name);

    super(
      amqp,
      {
        info: (message) => logger.log(message),
        warn: (message) => logger.warn(message),
      },
      {
        dlqExchange: DEAD_LETTER_EXCHANGE_NAME,
        maxRetries: GatewayConfig.DEFAULT_MAX_RETRIES,
      },
    );
  }
}
