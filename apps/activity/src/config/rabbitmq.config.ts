import type { RabbitMQConfig } from '@golevelup/nestjs-rabbitmq';
import { registerAs } from '@nestjs/config';
import { ConfigKey } from 'src/config/config-key.enum';
import { Queue } from 'src/enum/queue.enum';
import { RoutingKey } from 'src/enum/routing-key.enum';

export const DEFAULT_EXCHANGE_NAME = 'default';
export const DEAD_LETTER_EXCHANGE_NAME = 'dlx';
export const RETRY_EXCHANGE_NAME = 'retry';
export const DEFAULT_RPC_TIMEOUT = 15000;

const DEFAULT_TTL = 30000; // 30 seconds

export default registerAs(ConfigKey.RABBITMQ, (): RabbitMQConfig => {
  const { RABBITMQ_URI } = process.env;

  return {
    uri: RABBITMQ_URI,
    exchanges: [
      { name: DEFAULT_EXCHANGE_NAME, type: 'topic' },
      {
        name: DEAD_LETTER_EXCHANGE_NAME,
        type: 'topic',
      },
      {
        name: RETRY_EXCHANGE_NAME,
        type: 'topic',
      },
    ],
    queues: [
      {
        name: Queue.ACTIVITY_LOG_CREATE_RETRY,
        exchange: RETRY_EXCHANGE_NAME,
        routingKey: RoutingKey.ACTIVITY_LOG_CREATE_RETRY,
        options: {
          durable: true,
          messageTtl: DEFAULT_TTL,
          deadLetterExchange: DEFAULT_EXCHANGE_NAME,
          deadLetterRoutingKey: RoutingKey.ACTIVITY_LOG_CREATE,
        },
      },
    ],
    channels: {
      default: {
        prefetchCount: 1,
        default: true,
      },
    },
    connectionInitOptions: {},
  };
});
