import { RabbitMQConfig } from '@golevelup/nestjs-rabbitmq';
import { registerAs } from '@nestjs/config';
import { ConfigKey } from 'src/config/config-key.enum';
import { Queue } from 'src/gateway/enums/queue.enum';
import { RoutingKey } from 'src/gateway/enums/routing-key.enum';

export const DEFAULT_EXCHANGE_NAME = 'default';
export const DEAD_LETTER_EXCHANGE_NAME = 'dlx';
export const RETRY_EXCHANGE_NAME = 'retry';
export const DEFAULT_RPC_TIMEOUT = 5000;

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
      // Timer retry queues
      {
        name: Queue.GUILDS_TIMERS_UPDATE_RETRY,
        exchange: RETRY_EXCHANGE_NAME,
        routingKey: RoutingKey.GUILDS_TIMERS_UPDATE_RETRY,
        options: {
          durable: true,
          messageTtl: DEFAULT_TTL,
          deadLetterExchange: DEFAULT_EXCHANGE_NAME,
          deadLetterRoutingKey: RoutingKey.GUILDS_TIMERS_UPDATE,
        },
      },
      {
        name: Queue.GUILDS_TIMERS_DELETE_RETRY,
        exchange: RETRY_EXCHANGE_NAME,
        routingKey: RoutingKey.GUILDS_TIMERS_DELETE_RETRY,
        options: {
          durable: true,
          messageTtl: DEFAULT_TTL,
          deadLetterExchange: DEFAULT_EXCHANGE_NAME,
          deadLetterRoutingKey: RoutingKey.GUILDS_TIMERS_DELETE,
        },
      },
      // Message retry queues
      {
        name: Queue.GUILDS_SEND_MESSAGE_RETRY,
        exchange: RETRY_EXCHANGE_NAME,
        routingKey: RoutingKey.GUILDS_SEND_MESSAGE_RETRY,
        options: {
          durable: true,
          messageTtl: DEFAULT_TTL,
          deadLetterExchange: DEFAULT_EXCHANGE_NAME,
          deadLetterRoutingKey: RoutingKey.GUILDS_SEND_MESSAGE,
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
      // Notification retry queue
      {
        name: Queue.GUILDS_SEND_NOTIFICATION_RETRY,
        exchange: RETRY_EXCHANGE_NAME,
        routingKey: RoutingKey.GUILDS_NOTIFICATIONS_SEND_RETRY,
        options: {
          durable: true,
          messageTtl: DEFAULT_TTL,
          deadLetterExchange: DEFAULT_EXCHANGE_NAME,
          deadLetterRoutingKey: RoutingKey.GUILDS_NOTIFICATIONS_SEND,
        },
      },
    ],
    channels: {
      default: {
        prefetchCount: 1,
        default: true,
      },
    },
  };
});
