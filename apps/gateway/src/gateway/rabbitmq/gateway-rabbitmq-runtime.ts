import {
  connect,
  type AmqpConnectionManager,
  type ChannelWrapper,
  type Options,
} from "amqp-connection-manager";
import type { Channel, ConsumeMessage } from "amqplib";
import {
  DEAD_LETTER_EXCHANGE_NAME,
  DEFAULT_EXCHANGE_NAME,
  DEFAULT_RETRY_TTL_MS,
  RETRY_EXCHANGE_NAME,
} from "../../config/rabbitmq.config.js";
import { Queue } from "../enums/queue.enum.js";
import { RoutingKey } from "../enums/routing-key.enum.js";
import {
  GatewayQueueHandler,
  type AmqpMessage,
} from "../gateway-queue.handler.js";
import type { AmqpPublisher, AmqpPublisherRef } from "./amqp-publisher.js";

type LoggerLike = {
  error(message: string, meta?: Record<string, unknown>): void;
  info(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
};

type QueueHandler = (
  payload: any,
  message: AmqpMessage,
) => Promise<void> | void;

interface ConsumerDefinition {
  dlqQueue?: Queue;
  dlqRoutingKey?: RoutingKey;
  exchange: string;
  handler: QueueHandler;
  queue: Queue;
  retryQueue?: Queue;
  retryRoutingKey?: RoutingKey;
  routingKey: RoutingKey;
}

export interface GatewayRabbitmqRuntimeOptions {
  logger: LoggerLike;
  publisherRef: AmqpPublisherRef;
  queueHandler: GatewayQueueHandler;
  rabbitmqUri: string;
}

export class GatewayRabbitmqRuntime implements AmqpPublisher {
  private readonly connection: AmqpConnectionManager;
  private readonly publisherChannel: ChannelWrapper;
  private readonly consumerChannel: ChannelWrapper;
  private consumersRegistered = false;

  constructor(private readonly options: GatewayRabbitmqRuntimeOptions) {
    this.connection = connect([options.rabbitmqUri], {
      heartbeatIntervalInSeconds: 5,
      reconnectTimeInSeconds: 5,
    });
    this.publisherChannel = this.connection.createChannel({
      confirm: true,
      name: "gateway-publisher",
    });
    this.consumerChannel = this.connection.createChannel({
      confirm: false,
      name: "gateway-consumer",
      setup: async (channel: Channel) => {
        await this.assertTopology(channel);
      },
    });

    this.options.publisherRef.set(this);
    this.registerConnectionLogging();
  }

  async start(): Promise<void> {
    await Promise.all([
      this.publisherChannel.waitForConnect(),
      this.consumerChannel.waitForConnect(),
    ]);

    if (!this.consumersRegistered) {
      await this.registerConsumers();
      this.consumersRegistered = true;
    }

    this.options.logger.info("Gateway RabbitMQ runtime started");
  }

  async close(): Promise<void> {
    await Promise.allSettled([
      this.consumerChannel.cancelAll(),
      this.consumerChannel.close(),
      this.publisherChannel.close(),
    ]);
    await this.connection.close();
  }

  async publish(
    exchange: string,
    routingKey: string,
    payload: unknown,
    options?: Options.Publish,
  ): Promise<void> {
    await this.publisherChannel.publish(
      exchange,
      routingKey,
      Buffer.from(JSON.stringify(payload)),
      {
        contentType: "application/json",
        persistent: true,
        ...options,
      },
    );
  }

  private registerConnectionLogging() {
    this.connection.on("connect", () => {
      this.options.logger.info("Gateway RabbitMQ connected");
    });
    this.connection.on("disconnect", ({ err }) => {
      this.options.logger.warn("Gateway RabbitMQ disconnected", {
        error: err,
      });
    });
    this.connection.on("blocked", ({ reason }) => {
      this.options.logger.warn("Gateway RabbitMQ connection blocked", {
        reason,
      });
    });
    this.connection.on("unblocked", () => {
      this.options.logger.info("Gateway RabbitMQ connection unblocked");
    });
    this.consumerChannel.on("error", (error) => {
      this.options.logger.error("Gateway consumer channel error", { error });
    });
    this.publisherChannel.on("error", (error) => {
      this.options.logger.error("Gateway publisher channel error", { error });
    });
  }

  private primaryConsumers(): ConsumerDefinition[] {
    const queueHandler = this.options.queueHandler;

    return [
      {
        exchange: DEFAULT_EXCHANGE_NAME,
        queue: Queue.GUILDS_TIMERS_UPDATE,
        routingKey: RoutingKey.GUILDS_TIMERS_UPDATE,
        retryQueue: Queue.GUILDS_TIMERS_UPDATE_RETRY,
        retryRoutingKey: RoutingKey.GUILDS_TIMERS_UPDATE_RETRY,
        dlqQueue: Queue.GUILDS_TIMERS_UPDATE_DLQ,
        dlqRoutingKey: RoutingKey.GUILDS_TIMERS_UPDATE_DLQ,
        handler: queueHandler.handleGuildsTimerUpdate.bind(queueHandler),
      },
      {
        exchange: DEFAULT_EXCHANGE_NAME,
        queue: Queue.GUILDS_TIMERS_DELETE,
        routingKey: RoutingKey.GUILDS_TIMERS_DELETE,
        retryQueue: Queue.GUILDS_TIMERS_DELETE_RETRY,
        retryRoutingKey: RoutingKey.GUILDS_TIMERS_DELETE_RETRY,
        dlqQueue: Queue.GUILDS_TIMERS_DELETE_DLQ,
        dlqRoutingKey: RoutingKey.GUILDS_TIMERS_DELETE_DLQ,
        handler: queueHandler.handleGuildsTimerDelete.bind(queueHandler),
      },
      {
        exchange: DEFAULT_EXCHANGE_NAME,
        queue: Queue.GUILDS_RESERVATIONS_CREATE,
        routingKey: RoutingKey.GUILDS_RESERVATIONS_CREATE,
        retryQueue: Queue.GUILDS_RESERVATIONS_CREATE_RETRY,
        retryRoutingKey: RoutingKey.GUILDS_RESERVATIONS_CREATE_RETRY,
        dlqQueue: Queue.GUILDS_RESERVATIONS_CREATE_DLQ,
        dlqRoutingKey: RoutingKey.GUILDS_RESERVATIONS_CREATE_DLQ,
        handler: queueHandler.handleGuildsReservationCreate.bind(queueHandler),
      },
      {
        exchange: DEFAULT_EXCHANGE_NAME,
        queue: Queue.GUILDS_RESERVATIONS_DELETE,
        routingKey: RoutingKey.GUILDS_RESERVATIONS_DELETE,
        retryQueue: Queue.GUILDS_RESERVATIONS_DELETE_RETRY,
        retryRoutingKey: RoutingKey.GUILDS_RESERVATIONS_DELETE_RETRY,
        dlqQueue: Queue.GUILDS_RESERVATIONS_DELETE_DLQ,
        dlqRoutingKey: RoutingKey.GUILDS_RESERVATIONS_DELETE_DLQ,
        handler: queueHandler.handleGuildsReservationDelete.bind(queueHandler),
      },
      {
        exchange: DEFAULT_EXCHANGE_NAME,
        queue: Queue.GUILDS_SEND_MESSAGE,
        routingKey: RoutingKey.GUILDS_SEND_MESSAGE,
        retryQueue: Queue.GUILDS_SEND_MESSAGE_RETRY,
        retryRoutingKey: RoutingKey.GUILDS_SEND_MESSAGE_RETRY,
        dlqQueue: Queue.GUILDS_SEND_MESSAGE_DLQ,
        dlqRoutingKey: RoutingKey.GUILDS_SEND_MESSAGE_DLQ,
        handler: queueHandler.handleGuildMessageSend.bind(queueHandler),
      },
      {
        exchange: DEFAULT_EXCHANGE_NAME,
        queue: Queue.GUILDS_MEMBERS_ADD,
        routingKey: RoutingKey.GUILDS_MEMBERS_ADD,
        retryQueue: Queue.GUILDS_MEMBERS_ADD_RETRY,
        retryRoutingKey: RoutingKey.GUILDS_MEMBERS_ADD_RETRY,
        dlqQueue: Queue.GUILDS_MEMBERS_ADD_DLQ,
        dlqRoutingKey: RoutingKey.GUILDS_MEMBERS_ADD_DLQ,
        handler: queueHandler.handleAddMember.bind(queueHandler),
      },
      {
        exchange: DEFAULT_EXCHANGE_NAME,
        queue: Queue.GUILDS_MEMBERS_UPDATE,
        routingKey: RoutingKey.GUILDS_MEMBERS_UPDATE,
        retryQueue: Queue.GUILDS_MEMBERS_UPDATE_RETRY,
        retryRoutingKey: RoutingKey.GUILDS_MEMBERS_UPDATE_RETRY,
        dlqQueue: Queue.GUILDS_MEMBERS_UPDATE_DLQ,
        dlqRoutingKey: RoutingKey.GUILDS_MEMBERS_UPDATE_DLQ,
        handler: queueHandler.handleUpdateMember.bind(queueHandler),
      },
      {
        exchange: DEFAULT_EXCHANGE_NAME,
        queue: Queue.GUILDS_MEMBERS_REMOVE,
        routingKey: RoutingKey.GUILDS_MEMBERS_REMOVE,
        retryQueue: Queue.GUILDS_MEMBERS_REMOVE_RETRY,
        retryRoutingKey: RoutingKey.GUILDS_MEMBERS_REMOVE_RETRY,
        dlqQueue: Queue.GUILDS_MEMBERS_REMOVE_DLQ,
        dlqRoutingKey: RoutingKey.GUILDS_MEMBERS_REMOVE_DLQ,
        handler: queueHandler.handleDeleteMember.bind(queueHandler),
      },
      {
        exchange: DEFAULT_EXCHANGE_NAME,
        queue: Queue.GUILDS_MEMBERS_ADD_ROLE,
        routingKey: RoutingKey.GUILDS_MEMBERS_ADD_ROLE,
        retryQueue: Queue.GUILDS_MEMBERS_ADD_ROLE_RETRY,
        retryRoutingKey: RoutingKey.GUILDS_MEMBERS_ADD_ROLE_RETRY,
        dlqQueue: Queue.GUILDS_MEMBERS_ADD_ROLE_DLQ,
        dlqRoutingKey: RoutingKey.GUILDS_MEMBERS_ADD_ROLE_DLQ,
        handler: queueHandler.handleAddMemberRole.bind(queueHandler),
      },
      {
        exchange: DEFAULT_EXCHANGE_NAME,
        queue: Queue.GUILDS_MEMBERS_REMOVE_ROLE,
        routingKey: RoutingKey.GUILDS_MEMBERS_REMOVE_ROLE,
        retryQueue: Queue.GUILDS_MEMBERS_REMOVE_ROLE_RETRY,
        retryRoutingKey: RoutingKey.GUILDS_MEMBERS_REMOVE_ROLE_RETRY,
        dlqQueue: Queue.GUILDS_MEMBERS_REMOVE_ROLE_DLQ,
        dlqRoutingKey: RoutingKey.GUILDS_MEMBERS_REMOVE_ROLE_DLQ,
        handler: queueHandler.handleDeleteMemberRole.bind(queueHandler),
      },
      {
        exchange: DEFAULT_EXCHANGE_NAME,
        queue: Queue.GUILDS_SEND_NOTIFICATION,
        routingKey: RoutingKey.GUILDS_NOTIFICATIONS_SEND,
        retryQueue: Queue.GUILDS_SEND_NOTIFICATION_RETRY,
        retryRoutingKey: RoutingKey.GUILDS_NOTIFICATIONS_SEND_RETRY,
        dlqQueue: Queue.GUILDS_SEND_NOTIFICATION_DLQ,
        dlqRoutingKey: RoutingKey.GUILDS_NOTIFICATIONS_SEND_DLQ,
        handler: queueHandler.handleSendNotification.bind(queueHandler),
      },
      {
        exchange: DEFAULT_EXCHANGE_NAME,
        queue: Queue.GUILDS_NOTIFICATIONS_VOLUNTEER,
        routingKey: RoutingKey.GUILDS_NOTIFICATIONS_VOLUNTEER,
        retryQueue: Queue.GUILDS_NOTIFICATIONS_VOLUNTEER_RETRY,
        retryRoutingKey: RoutingKey.GUILDS_NOTIFICATIONS_VOLUNTEER_RETRY,
        dlqQueue: Queue.GUILDS_NOTIFICATIONS_VOLUNTEER_DLQ,
        dlqRoutingKey: RoutingKey.GUILDS_NOTIFICATIONS_VOLUNTEER_DLQ,
        handler: queueHandler.handleVolunteerNotification.bind(queueHandler),
      },
      {
        exchange: DEFAULT_EXCHANGE_NAME,
        queue: Queue.GUILDS_PARTY_GATHERING,
        routingKey: RoutingKey.GUILDS_PARTY_GATHERING,
        retryQueue: Queue.GUILDS_PARTY_GATHERING_RETRY,
        retryRoutingKey: RoutingKey.GUILDS_PARTY_GATHERING_RETRY,
        dlqQueue: Queue.GUILDS_PARTY_GATHERING_DLQ,
        dlqRoutingKey: RoutingKey.GUILDS_PARTY_GATHERING_DLQ,
        handler: queueHandler.handlePartyGathering.bind(queueHandler),
      },
      {
        exchange: DEFAULT_EXCHANGE_NAME,
        queue: Queue.GUILDS_PARTY_GATHERING_CANCEL,
        routingKey: RoutingKey.GUILDS_PARTY_GATHERING_CANCEL,
        handler: queueHandler.handlePartyGatheringCancel.bind(queueHandler),
      },
      {
        exchange: DEFAULT_EXCHANGE_NAME,
        queue: Queue.GUILDS_UPDATE_MESSAGE,
        routingKey: RoutingKey.GUILDS_UPDATE_MESSAGE,
        handler: queueHandler.handleUpdateMessage.bind(queueHandler),
      },
      {
        exchange: DEFAULT_EXCHANGE_NAME,
        queue: Queue.GUILDS_DELETE_MESSAGE,
        routingKey: RoutingKey.GUILDS_DELETE_MESSAGE,
        handler: queueHandler.handleDeleteMessage.bind(queueHandler),
      },
      {
        exchange: DEFAULT_EXCHANGE_NAME,
        queue: Queue.GUILDS_MEMBERS_REFRESH_JOB_UPDATE,
        routingKey: RoutingKey.GUILDS_MEMBERS_REFRESH_JOB_UPDATE,
        handler: queueHandler.handleMembersRefreshJobUpdate.bind(queueHandler),
      },
      {
        exchange: DEFAULT_EXCHANGE_NAME,
        queue: Queue.EVENT_MAP_STATUS_UPDATE,
        routingKey: RoutingKey.EVENT_MAP_STATUS_UPDATE,
        handler: queueHandler.handleEventMapStatusUpdate.bind(queueHandler),
      },
      {
        exchange: DEFAULT_EXCHANGE_NAME,
        queue: Queue.EVENT_HERO_KILLED,
        routingKey: RoutingKey.EVENT_HERO_KILLED,
        handler: queueHandler.handleEventHeroKilled.bind(queueHandler),
      },
      {
        exchange: DEFAULT_EXCHANGE_NAME,
        queue: Queue.EVENT_RANKING_UPDATE,
        routingKey: RoutingKey.EVENT_RANKING_UPDATE,
        handler: queueHandler.handleEventRankingUpdate.bind(queueHandler),
      },
      {
        exchange: DEFAULT_EXCHANGE_NAME,
        queue: Queue.EVENT_RESPAWN_WINDOW_OPENED,
        routingKey: RoutingKey.EVENT_RESPAWN_WINDOW_OPENED,
        handler: queueHandler.handleEventRespawnWindowOpened.bind(queueHandler),
      },
      {
        exchange: DEFAULT_EXCHANGE_NAME,
        queue: Queue.EVENT_RESPAWN_WINDOW_CLOSED,
        routingKey: RoutingKey.EVENT_RESPAWN_WINDOW_CLOSED,
        handler: queueHandler.handleEventRespawnWindowClosed.bind(queueHandler),
      },
      {
        exchange: DEFAULT_EXCHANGE_NAME,
        queue: Queue.PRESENCE_CHECK_REQUEST,
        routingKey: RoutingKey.PRESENCE_CHECK_REQUEST,
        handler: queueHandler.handlePresenceCheckRequest.bind(queueHandler),
      },
    ];
  }

  private dlqConsumers(): ConsumerDefinition[] {
    const queueHandler = this.options.queueHandler;

    return [
      {
        exchange: DEAD_LETTER_EXCHANGE_NAME,
        queue: Queue.GUILDS_TIMERS_UPDATE_DLQ,
        routingKey: RoutingKey.GUILDS_TIMERS_UPDATE_DLQ,
        handler: queueHandler.handleTimerUpdateDLQ.bind(queueHandler),
      },
      {
        exchange: DEAD_LETTER_EXCHANGE_NAME,
        queue: Queue.GUILDS_TIMERS_DELETE_DLQ,
        routingKey: RoutingKey.GUILDS_TIMERS_DELETE_DLQ,
        handler: queueHandler.handleTimerDeleteDLQ.bind(queueHandler),
      },
      {
        exchange: DEAD_LETTER_EXCHANGE_NAME,
        queue: Queue.GUILDS_RESERVATIONS_CREATE_DLQ,
        routingKey: RoutingKey.GUILDS_RESERVATIONS_CREATE_DLQ,
        handler: queueHandler.handleReservationCreateDLQ.bind(queueHandler),
      },
      {
        exchange: DEAD_LETTER_EXCHANGE_NAME,
        queue: Queue.GUILDS_RESERVATIONS_DELETE_DLQ,
        routingKey: RoutingKey.GUILDS_RESERVATIONS_DELETE_DLQ,
        handler: queueHandler.handleReservationDeleteDLQ.bind(queueHandler),
      },
      {
        exchange: DEAD_LETTER_EXCHANGE_NAME,
        queue: Queue.GUILDS_SEND_MESSAGE_DLQ,
        routingKey: RoutingKey.GUILDS_SEND_MESSAGE_DLQ,
        handler: queueHandler.handleSendMessageDLQ.bind(queueHandler),
      },
      {
        exchange: DEAD_LETTER_EXCHANGE_NAME,
        queue: Queue.GUILDS_MEMBERS_ADD_DLQ,
        routingKey: RoutingKey.GUILDS_MEMBERS_ADD_DLQ,
        handler: queueHandler.handleAddMemberDLQ.bind(queueHandler),
      },
      {
        exchange: DEAD_LETTER_EXCHANGE_NAME,
        queue: Queue.GUILDS_MEMBERS_UPDATE_DLQ,
        routingKey: RoutingKey.GUILDS_MEMBERS_UPDATE_DLQ,
        handler: queueHandler.handleUpdateMemberDLQ.bind(queueHandler),
      },
      {
        exchange: DEAD_LETTER_EXCHANGE_NAME,
        queue: Queue.GUILDS_MEMBERS_REMOVE_DLQ,
        routingKey: RoutingKey.GUILDS_MEMBERS_REMOVE_DLQ,
        handler: queueHandler.handleDeleteMemberDLQ.bind(queueHandler),
      },
      {
        exchange: DEAD_LETTER_EXCHANGE_NAME,
        queue: Queue.GUILDS_MEMBERS_ADD_ROLE_DLQ,
        routingKey: RoutingKey.GUILDS_MEMBERS_ADD_ROLE_DLQ,
        handler: queueHandler.handleAddMemberRoleDLQ.bind(queueHandler),
      },
      {
        exchange: DEAD_LETTER_EXCHANGE_NAME,
        queue: Queue.GUILDS_MEMBERS_REMOVE_ROLE_DLQ,
        routingKey: RoutingKey.GUILDS_MEMBERS_REMOVE_ROLE_DLQ,
        handler: queueHandler.handleDeleteMemberRoleDLQ.bind(queueHandler),
      },
      {
        exchange: DEAD_LETTER_EXCHANGE_NAME,
        queue: Queue.GUILDS_SEND_NOTIFICATION_DLQ,
        routingKey: RoutingKey.GUILDS_NOTIFICATIONS_SEND_DLQ,
        handler: queueHandler.handleSendNotificationDLQ.bind(queueHandler),
      },
      {
        exchange: DEAD_LETTER_EXCHANGE_NAME,
        queue: Queue.GUILDS_NOTIFICATIONS_VOLUNTEER_DLQ,
        routingKey: RoutingKey.GUILDS_NOTIFICATIONS_VOLUNTEER_DLQ,
        handler: queueHandler.handleVolunteerNotificationDLQ.bind(queueHandler),
      },
      {
        exchange: DEAD_LETTER_EXCHANGE_NAME,
        queue: Queue.GUILDS_PARTY_GATHERING_DLQ,
        routingKey: RoutingKey.GUILDS_PARTY_GATHERING_DLQ,
        handler: queueHandler.handlePartyGatheringDLQ.bind(queueHandler),
      },
    ];
  }

  private async assertTopology(channel: Channel): Promise<void> {
    await channel.assertExchange(DEFAULT_EXCHANGE_NAME, "topic", {
      durable: true,
    });
    await channel.assertExchange(DEAD_LETTER_EXCHANGE_NAME, "topic", {
      durable: true,
    });
    await channel.assertExchange(RETRY_EXCHANGE_NAME, "topic", {
      durable: true,
    });

    for (const consumer of this.primaryConsumers()) {
      await channel.assertQueue(consumer.queue, {
        durable: true,
        ...(consumer.retryRoutingKey
          ? {
              deadLetterExchange: RETRY_EXCHANGE_NAME,
              deadLetterRoutingKey: consumer.retryRoutingKey,
            }
          : {}),
      });
      await channel.bindQueue(
        consumer.queue,
        consumer.exchange,
        consumer.routingKey,
      );

      if (consumer.retryQueue && consumer.retryRoutingKey) {
        await channel.assertQueue(consumer.retryQueue, {
          durable: true,
          messageTtl: DEFAULT_RETRY_TTL_MS,
          deadLetterExchange: DEFAULT_EXCHANGE_NAME,
          deadLetterRoutingKey: consumer.routingKey,
        });
        await channel.bindQueue(
          consumer.retryQueue,
          RETRY_EXCHANGE_NAME,
          consumer.retryRoutingKey,
        );
      }

      if (consumer.dlqQueue && consumer.dlqRoutingKey) {
        await channel.assertQueue(consumer.dlqQueue, { durable: true });
        await channel.bindQueue(
          consumer.dlqQueue,
          DEAD_LETTER_EXCHANGE_NAME,
          consumer.dlqRoutingKey,
        );
      }
    }
  }

  private async registerConsumers(): Promise<void> {
    await Promise.all(
      [...this.primaryConsumers(), ...this.dlqConsumers()].map(
        async (consumer) => {
          await this.consumerChannel.consume(
            consumer.queue,
            async (message) => {
              await this.handleMessage(consumer, message);
            },
            { noAck: false, prefetch: 1 },
          );
        },
      ),
    );
  }

  private async handleMessage(
    consumer: ConsumerDefinition,
    message: ConsumeMessage | null,
  ): Promise<void> {
    if (message === null) {
      return;
    }

    try {
      const payload = JSON.parse(message.content.toString("utf8")) as unknown;
      await consumer.handler(payload, {
        properties: {
          headers: message.properties.headers as
            | Record<string, unknown>
            | undefined,
        },
      });
      this.consumerChannel.ack(message);
    } catch (error) {
      this.options.logger.error("Failed to process RabbitMQ message", {
        queue: consumer.queue,
        routingKey: consumer.routingKey,
        error,
      });
      this.consumerChannel.nack(message, false, false);
    }
  }
}
