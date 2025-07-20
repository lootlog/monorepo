import {
  MessageHandlerErrorBehavior,
  RabbitSubscribe,
} from '@golevelup/nestjs-rabbitmq';
import { Injectable } from '@nestjs/common';
import { CreateRoleDto } from 'src/roles/dto/create-role.dto';
import { DeleteRoleDto } from 'src/roles/dto/delete-role.dto';
import { UpdateRoleDto } from 'src/roles/dto/update-role.dto';
import { Queue } from 'src/enum/queue.enum';
import { RolesService } from 'src/roles/roles.service';
import { RoutingKey } from 'src/enum/routing-key.enum';
import {
  DEFAULT_EXCHANGE_NAME,
  DEAD_LETTER_EXCHANGE_NAME,
  RETRY_EXCHANGE_NAME,
} from 'src/config/rabbitmq.config';
import { RetryService } from 'src/rabbitmq/retry.service';

@Injectable()
export class RolesEventsHandler {
  constructor(
    private readonly rolesService: RolesService,
    private readonly retryService: RetryService,
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
  async handleRoleCreate(data: CreateRoleDto, amqpMsg: any) {
    const headers = amqpMsg.properties.headers || {};

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
    console.log(`Role created successfully: ${data.id}`);
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
  async handleRoleUpdate(data: UpdateRoleDto, amqpMsg: any) {
    const headers = amqpMsg.properties.headers || {};

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
    console.log(`Role updated successfully: ${data.id}`);
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
  async handleRoleDelete(data: DeleteRoleDto, amqpMsg: any) {
    const headers = amqpMsg.properties.headers || {};

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
    console.log(`Role deleted successfully: ${data.id}`);
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
  async handleRoleCreateDLQ(data: CreateRoleDto, amqpMsg: any) {
    console.error('Message sent to DLQ - Create Role:', {
      data,
      retryCount: this.retryService.getRetryCount(
        amqpMsg.properties.headers || {},
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
  async handleRoleUpdateDLQ(data: UpdateRoleDto, amqpMsg: any) {
    console.error('Message sent to DLQ - Update Role:', {
      data,
      retryCount: this.retryService.getRetryCount(
        amqpMsg.properties.headers || {},
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
  async handleRoleDeleteDLQ(data: DeleteRoleDto, amqpMsg: any) {
    console.error('Message sent to DLQ - Delete Role:', {
      data,
      retryCount: this.retryService.getRetryCount(
        amqpMsg.properties.headers || {},
      ),
      headers: amqpMsg.properties.headers,
    });
  }
}
