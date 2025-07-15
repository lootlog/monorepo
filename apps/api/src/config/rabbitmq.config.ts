import { RabbitMQConfig } from '@golevelup/nestjs-rabbitmq';
import { registerAs } from '@nestjs/config';
import { Queue } from 'src/enum/queue.enum';
import { RoutingKey } from 'src/enum/routing-key.enum';

export const DEFAULT_EXCHANGE_NAME = 'default';
export const DEAD_LETTER_EXCHANGE_NAME = 'dlx';
export const RETRY_EXCHANGE_NAME = 'retry';

const DEFAULT_TTL = 30000; // 30 seconds

export default registerAs('rabbitmq', (): RabbitMQConfig => {
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
        name: Queue.GUILDS_CREATE_RETRY,
        exchange: RETRY_EXCHANGE_NAME,
        routingKey: RoutingKey.GUILDS_CREATE_RETRY,
        options: {
          durable: true,
          messageTtl: DEFAULT_TTL,
          deadLetterExchange: DEFAULT_EXCHANGE_NAME,
          deadLetterRoutingKey: RoutingKey.GUILDS_CREATE,
        },
      },
      {
        name: Queue.GUILDS_UPDATE_RETRY,
        exchange: RETRY_EXCHANGE_NAME,
        routingKey: RoutingKey.GUILDS_UPDATE_RETRY,
        options: {
          durable: true,
          messageTtl: DEFAULT_TTL,
          deadLetterExchange: DEFAULT_EXCHANGE_NAME,
          deadLetterRoutingKey: RoutingKey.GUILDS_UPDATE,
        },
      },
      {
        name: Queue.GUILDS_DELETE_RETRY,
        exchange: RETRY_EXCHANGE_NAME,
        routingKey: RoutingKey.GUILDS_DELETE_RETRY,
        options: {
          durable: true,
          messageTtl: DEFAULT_TTL,
          deadLetterExchange: DEFAULT_EXCHANGE_NAME,
          deadLetterRoutingKey: RoutingKey.GUILDS_DELETE,
        },
      },
      // Roles retry queues
      {
        name: Queue.GUILDS_CREATE_ROLE_RETRY,
        exchange: RETRY_EXCHANGE_NAME,
        routingKey: RoutingKey.GUILDS_CREATE_ROLE_RETRY,
        options: {
          durable: true,
          messageTtl: DEFAULT_TTL,
          deadLetterExchange: DEFAULT_EXCHANGE_NAME,
          deadLetterRoutingKey: RoutingKey.GUILDS_CREATE_ROLE,
        },
      },
      {
        name: Queue.GUILDS_UPDATE_ROLE_RETRY,
        exchange: RETRY_EXCHANGE_NAME,
        routingKey: RoutingKey.GUILDS_UPDATE_ROLE_RETRY,
        options: {
          durable: true,
          messageTtl: DEFAULT_TTL,
          deadLetterExchange: DEFAULT_EXCHANGE_NAME,
          deadLetterRoutingKey: RoutingKey.GUILDS_UPDATE_ROLE,
        },
      },
      {
        name: Queue.GUILDS_DELETE_ROLE_RETRY,
        exchange: RETRY_EXCHANGE_NAME,
        routingKey: RoutingKey.GUILDS_DELETE_ROLE_RETRY,
        options: {
          durable: true,
          messageTtl: DEFAULT_TTL,
          deadLetterExchange: DEFAULT_EXCHANGE_NAME,
          deadLetterRoutingKey: RoutingKey.GUILDS_DELETE_ROLE,
        },
      },
      // Members retry queues
      {
        name: Queue.GUILDS_MEMBERS_ADD_RETRY,
        exchange: RETRY_EXCHANGE_NAME,
        routingKey: RoutingKey.GUILDS_MEMBERS_ADD_RETRY,
        options: {
          durable: true,
          messageTtl: DEFAULT_TTL,
          deadLetterExchange: DEFAULT_EXCHANGE_NAME,
          deadLetterRoutingKey: RoutingKey.GUILDS_MEMBERS_ADD,
        },
      },
      {
        name: Queue.GUILDS_MEMBERS_UPDATE_RETRY,
        exchange: RETRY_EXCHANGE_NAME,
        routingKey: RoutingKey.GUILDS_MEMBERS_UPDATE_RETRY,
        options: {
          durable: true,
          messageTtl: DEFAULT_TTL,
          deadLetterExchange: DEFAULT_EXCHANGE_NAME,
          deadLetterRoutingKey: RoutingKey.GUILDS_MEMBERS_UPDATE,
        },
      },
      {
        name: Queue.GUILDS_MEMBERS_REMOVE_RETRY,
        exchange: RETRY_EXCHANGE_NAME,
        routingKey: RoutingKey.GUILDS_MEMBERS_REMOVE_RETRY,
        options: {
          durable: true,
          messageTtl: DEFAULT_TTL,
          deadLetterExchange: DEFAULT_EXCHANGE_NAME,
          deadLetterRoutingKey: RoutingKey.GUILDS_MEMBERS_REMOVE,
        },
      },
      {
        name: Queue.GUILDS_MEMBERS_ADD_ROLE_RETRY,
        exchange: RETRY_EXCHANGE_NAME,
        routingKey: RoutingKey.GUILDS_MEMBERS_ADD_ROLE_RETRY,
        options: {
          durable: true,
          messageTtl: DEFAULT_TTL,
          deadLetterExchange: DEFAULT_EXCHANGE_NAME,
          deadLetterRoutingKey: RoutingKey.GUILDS_MEMBERS_ADD_ROLE,
        },
      },
      {
        name: Queue.GUILDS_MEMBERS_REMOVE_ROLE_RETRY,
        exchange: RETRY_EXCHANGE_NAME,
        routingKey: RoutingKey.GUILDS_MEMBERS_REMOVE_ROLE_RETRY,
        options: {
          durable: true,
          messageTtl: DEFAULT_TTL,
          deadLetterExchange: DEFAULT_EXCHANGE_NAME,
          deadLetterRoutingKey: RoutingKey.GUILDS_MEMBERS_REMOVE_ROLE,
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
