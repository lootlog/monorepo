import type { RabbitMQConfig } from "@golevelup/nestjs-rabbitmq";
import { Queue } from "src/gateway/enums/queue.enum";
import { RoutingKey } from "src/gateway/enums/routing-key.enum";
import { env } from "src/config/env";

export const DEFAULT_EXCHANGE_NAME = "default";
export const DEAD_LETTER_EXCHANGE_NAME = "dlx";
export const RETRY_EXCHANGE_NAME = "retry";

const DEFAULT_TTL = 30000; // 30 seconds

export const rabbitmqConfig: RabbitMQConfig = {
  uri: env.RABBITMQ_URI,
  exchanges: [
    { name: DEFAULT_EXCHANGE_NAME, type: "topic" },
    {
      name: DEAD_LETTER_EXCHANGE_NAME,
      type: "topic",
    },
    {
      name: RETRY_EXCHANGE_NAME,
      type: "topic",
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
    {
      name: Queue.GUILDS_RESERVATIONS_CREATE_RETRY,
      exchange: RETRY_EXCHANGE_NAME,
      routingKey: RoutingKey.GUILDS_RESERVATIONS_CREATE_RETRY,
      options: {
        durable: true,
        messageTtl: DEFAULT_TTL,
        deadLetterExchange: DEFAULT_EXCHANGE_NAME,
        deadLetterRoutingKey: RoutingKey.GUILDS_RESERVATIONS_CREATE,
      },
    },
    {
      name: Queue.GUILDS_RESERVATIONS_DELETE_RETRY,
      exchange: RETRY_EXCHANGE_NAME,
      routingKey: RoutingKey.GUILDS_RESERVATIONS_DELETE_RETRY,
      options: {
        durable: true,
        messageTtl: DEFAULT_TTL,
        deadLetterExchange: DEFAULT_EXCHANGE_NAME,
        deadLetterRoutingKey: RoutingKey.GUILDS_RESERVATIONS_DELETE,
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
