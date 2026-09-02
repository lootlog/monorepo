import {
  MessageHandlerErrorBehavior,
  RabbitSubscribe,
} from "@golevelup/nestjs-rabbitmq";
import { Inject, Injectable } from "@nestjs/common";
import { APPLICATION_LOGGER } from "#src/shared/logging/logger-token";
import type { Logger } from "winston";
import type { CreateRoleDto } from "#src/roles/dto/create-role.dto";
import type { DeleteRoleDto } from "#src/roles/dto/delete-role.dto";
import type { UpdateRoleDto } from "#src/roles/dto/update-role.dto";
import { Queue } from "#src/enum/queue.enum";
import { RolesService } from "#src/roles/roles.service";
import { RoutingKey } from "#src/enum/routing-key.enum";
import {
  DEFAULT_EXCHANGE_NAME,
  DEAD_LETTER_EXCHANGE_NAME,
  RETRY_EXCHANGE_NAME,
} from "#src/config/rabbitmq.config";
import { RetryService } from "#src/rabbitmq/retry.service";

interface AmqpMessage {
  properties: {
    headers?: Record<string, unknown>;
  };
}

@Injectable()
export class RolesEventsHandler {
  constructor(
    private readonly rolesService: RolesService,
    private readonly retryService: RetryService,
    @Inject(APPLICATION_LOGGER) private readonly logger: Logger,
  ) {}

  @RabbitSubscribe({
    exchange: DEFAULT_EXCHANGE_NAME,
    routingKey: RoutingKey.GUILDS_CREATE_ROLE,
    queue: Queue.GUILDS_CREATE_ROLE,
    errorBehavior: MessageHandlerErrorBehavior.NACK,
    queueOptions: {
      durable: true,
      deadLetterExchange: RETRY_EXCHANGE_NAME,
      deadLetterRoutingKey: RoutingKey.GUILDS_CREATE_ROLE_RETRY,
    },
  })
  async handleRoleCreate(data: CreateRoleDto, amqpMsg: AmqpMessage) {
    const headers = amqpMsg.properties.headers ?? {};

    const shouldContinue = await this.retryService.handleRetryLogic(
      data,
      headers,
      RoutingKey.GUILDS_CREATE_ROLE_DLQ,
      `role create: ${data.id}`,
    );

    if (!shouldContinue) {
      return;
    }

    await this.rolesService.createOrUpdateRole(data);
    this.logger.log({
      level: "info",
      message: "Role created successfully",
      roleId: data.id,
      guildId: data.guildId,
    });
  }

  @RabbitSubscribe({
    exchange: DEFAULT_EXCHANGE_NAME,
    routingKey: RoutingKey.GUILDS_UPDATE_ROLE,
    queue: Queue.GUILDS_UPDATE_ROLE,
    errorBehavior: MessageHandlerErrorBehavior.NACK,
    queueOptions: {
      durable: true,
      deadLetterExchange: RETRY_EXCHANGE_NAME,
      deadLetterRoutingKey: RoutingKey.GUILDS_UPDATE_ROLE_RETRY,
    },
  })
  async handleRoleUpdate(data: UpdateRoleDto, amqpMsg: AmqpMessage) {
    const headers = amqpMsg.properties.headers ?? {};

    const shouldContinue = await this.retryService.handleRetryLogic(
      data,
      headers,
      RoutingKey.GUILDS_UPDATE_ROLE_DLQ,
      `role update: ${data.id}`,
    );

    if (!shouldContinue) {
      return;
    }

    await this.rolesService.createOrUpdateRole(data);
    this.logger.log({
      level: "info",
      message: "Role updated successfully",
      roleId: data.id,
      guildId: data.guildId,
    });
  }

  @RabbitSubscribe({
    exchange: DEFAULT_EXCHANGE_NAME,
    routingKey: RoutingKey.GUILDS_DELETE_ROLE,
    queue: Queue.GUILDS_DELETE_ROLE,
    errorBehavior: MessageHandlerErrorBehavior.NACK,
    queueOptions: {
      durable: true,
      deadLetterExchange: RETRY_EXCHANGE_NAME,
      deadLetterRoutingKey: RoutingKey.GUILDS_DELETE_ROLE_RETRY,
    },
  })
  async handleRoleDelete(data: DeleteRoleDto, amqpMsg: AmqpMessage) {
    const headers = amqpMsg.properties.headers ?? {};

    const shouldContinue = await this.retryService.handleRetryLogic(
      data,
      headers,
      RoutingKey.GUILDS_DELETE_ROLE_DLQ,
      `role delete: ${data.id}`,
    );

    if (!shouldContinue) {
      return;
    }

    await this.rolesService.deleteRole(data);
    this.logger.log({
      level: "info",
      message: "Role deleted successfully",
      roleId: data.id,
      guildId: data.guildId,
    });
  }

  // DLQ Handlers
  @RabbitSubscribe({
    exchange: DEAD_LETTER_EXCHANGE_NAME,
    routingKey: RoutingKey.GUILDS_CREATE_ROLE_DLQ,
    queue: Queue.GUILDS_CREATE_ROLE_DLQ,
    queueOptions: {
      durable: true,
    },
  })
  handleRoleCreateDLQ(data: CreateRoleDto, amqpMsg: AmqpMessage) {
    this.logger.log({
      level: "error",
      message: "Message sent to DLQ - Create Role",
      roleId: data.id,
      guildId: data.guildId,
      retryCount: this.retryService.getRetryCount(
        amqpMsg.properties.headers ?? {},
      ),
      headers: amqpMsg.properties.headers,
    });
  }

  @RabbitSubscribe({
    exchange: DEAD_LETTER_EXCHANGE_NAME,
    routingKey: RoutingKey.GUILDS_UPDATE_ROLE_DLQ,
    queue: Queue.GUILDS_UPDATE_ROLE_DLQ,
    queueOptions: {
      durable: true,
    },
  })
  handleRoleUpdateDLQ(data: UpdateRoleDto, amqpMsg: AmqpMessage) {
    this.logger.log({
      level: "error",
      message: "Message sent to DLQ - Update Role",
      roleId: data.id,
      guildId: data.guildId,
      retryCount: this.retryService.getRetryCount(
        amqpMsg.properties.headers ?? {},
      ),
      headers: amqpMsg.properties.headers,
    });
  }

  @RabbitSubscribe({
    exchange: DEAD_LETTER_EXCHANGE_NAME,
    routingKey: RoutingKey.GUILDS_DELETE_ROLE_DLQ,
    queue: Queue.GUILDS_DELETE_ROLE_DLQ,
    queueOptions: {
      durable: true,
    },
  })
  handleRoleDeleteDLQ(data: DeleteRoleDto, amqpMsg: AmqpMessage) {
    this.logger.log({
      level: "error",
      message: "Message sent to DLQ - Delete Role",
      roleId: data.id,
      guildId: data.guildId,
      retryCount: this.retryService.getRetryCount(
        amqpMsg.properties.headers ?? {},
      ),
      headers: amqpMsg.properties.headers,
    });
  }
}
