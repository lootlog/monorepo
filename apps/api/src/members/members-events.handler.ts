import { Injectable } from '@nestjs/common';
import { MembersService } from './members.service';
import { DeleteMemberRoleDto } from './dto/delete-member-role.dto';
import { AddMemberRoleDto } from 'src/members/dto/add-member-role.dto';
import { AddMemberDto } from 'src/members/dto/add-member.dto';
import { DeleteMemberDto } from 'src/members/dto/delete-member.dto';
import {
  MessageHandlerErrorBehavior,
  RabbitSubscribe,
} from '@golevelup/nestjs-rabbitmq';
import { Queue } from 'src/enum/queue.enum';
import { RoutingKey } from 'src/enum/routing-key.enum';
import {
  DEAD_LETTER_EXCHANGE_NAME,
  RETRY_EXCHANGE_NAME,
} from 'src/config/rabbitmq.config';
import { RetryService } from 'src/rabbitmq/retry.service';

@Injectable()
export class MembersEventsHandler {
  constructor(
    private readonly membersService: MembersService,
    private readonly retryService: RetryService,
  ) {}

  @RabbitSubscribe({
    exchange: 'default',
    routingKey: RoutingKey.GUILDS_MEMBERS_ADD,
    queue: Queue.GUILDS_MEMBERS_ADD,
    errorBehavior: MessageHandlerErrorBehavior.NACK,
    queueOptions: {
      durable: true,
      deadLetterExchange: RETRY_EXCHANGE_NAME,
      deadLetterRoutingKey: RoutingKey.GUILDS_MEMBERS_ADD_RETRY,
    },
  })
  async handleAddMember(data: AddMemberDto, amqpMsg: any) {
    const headers = amqpMsg.properties.headers || {};

    const shouldContinue = await this.retryService.handleRetryLogic(
      data,
      headers,
      RoutingKey.GUILDS_MEMBERS_ADD_DLQ,
      `member add: ${data.id}`,
    );

    if (!shouldContinue) {
      return;
    }

    await this.membersService.addMember(data);
    console.log(`Member added successfully: ${data.id}`);
  }

  @RabbitSubscribe({
    exchange: 'default',
    routingKey: RoutingKey.GUILDS_MEMBERS_REMOVE,
    queue: Queue.GUILDS_MEMBERS_REMOVE,
    errorBehavior: MessageHandlerErrorBehavior.NACK,
    queueOptions: {
      durable: true,
      deadLetterExchange: RETRY_EXCHANGE_NAME,
      deadLetterRoutingKey: RoutingKey.GUILDS_MEMBERS_REMOVE_RETRY,
    },
  })
  async handleDeleteMember(data: DeleteMemberDto, amqpMsg: any) {
    const headers = amqpMsg.properties.headers || {};

    const shouldContinue = await this.retryService.handleRetryLogic(
      data,
      headers,
      RoutingKey.GUILDS_MEMBERS_REMOVE_DLQ,
      `member delete: ${data.id}`,
    );

    if (!shouldContinue) {
      return;
    }

    await this.membersService.deleteMember(data);
    console.log(`Member deleted successfully: ${data.id}`);
  }

  @RabbitSubscribe({
    exchange: 'default',
    routingKey: RoutingKey.GUILDS_MEMBERS_ADD_ROLE,
    queue: Queue.GUILDS_MEMBERS_ADD_ROLE,
    errorBehavior: MessageHandlerErrorBehavior.NACK,
    queueOptions: {
      durable: true,
      deadLetterExchange: RETRY_EXCHANGE_NAME,
      deadLetterRoutingKey: RoutingKey.GUILDS_MEMBERS_ADD_ROLE_RETRY,
    },
  })
  async handleAddMemberRole(data: AddMemberRoleDto, amqpMsg: any) {
    const headers = amqpMsg.properties.headers || {};

    const shouldContinue = await this.retryService.handleRetryLogic(
      data,
      headers,
      RoutingKey.GUILDS_MEMBERS_ADD_ROLE_DLQ,
      `member add role: ${data.id}`,
    );

    if (!shouldContinue) {
      return;
    }

    await this.membersService.addMemberRole(data);
    console.log(`Member role added successfully: ${data.id}`);
  }

  @RabbitSubscribe({
    exchange: 'default',
    routingKey: RoutingKey.GUILDS_MEMBERS_REMOVE_ROLE,
    queue: Queue.GUILDS_MEMBERS_REMOVE_ROLE,
    errorBehavior: MessageHandlerErrorBehavior.NACK,
    queueOptions: {
      durable: true,
      deadLetterExchange: RETRY_EXCHANGE_NAME,
      deadLetterRoutingKey: RoutingKey.GUILDS_MEMBERS_REMOVE_ROLE_RETRY,
    },
  })
  async handleDeleteMemberRole(data: DeleteMemberRoleDto, amqpMsg: any) {
    const headers = amqpMsg.properties.headers || {};

    const shouldContinue = await this.retryService.handleRetryLogic(
      data,
      headers,
      RoutingKey.GUILDS_MEMBERS_REMOVE_ROLE_DLQ,
      `member remove role: ${data.id}`,
    );

    if (!shouldContinue) {
      return;
    }

    await this.membersService.deleteMemberRole(data);
    console.log(`Member role removed successfully: ${data.id}`);
  }

  // DLQ Handlers
  @RabbitSubscribe({
    exchange: DEAD_LETTER_EXCHANGE_NAME,
    routingKey: RoutingKey.GUILDS_MEMBERS_ADD_DLQ,
    queue: Queue.GUILDS_MEMBERS_ADD_DLQ,
    queueOptions: {
      durable: true,
    },
  })
  async handleAddMemberDLQ(data: AddMemberDto, amqpMsg: any) {
    console.error('Message sent to DLQ - Add Member:', {
      data,
      retryCount: this.retryService.getRetryCount(
        amqpMsg.properties.headers || {},
      ),
      headers: amqpMsg.properties.headers,
    });
  }

  @RabbitSubscribe({
    exchange: DEAD_LETTER_EXCHANGE_NAME,
    routingKey: RoutingKey.GUILDS_MEMBERS_UPDATE_DLQ,
    queue: Queue.GUILDS_MEMBERS_UPDATE_DLQ,
    queueOptions: {
      durable: true,
    },
  })
  async handleUpdateMemberDLQ(data: AddMemberDto, amqpMsg: any) {
    console.error('Message sent to DLQ - Update Member:', {
      data,
      retryCount: this.retryService.getRetryCount(
        amqpMsg.properties.headers || {},
      ),
      headers: amqpMsg.properties.headers,
    });
  }

  @RabbitSubscribe({
    exchange: DEAD_LETTER_EXCHANGE_NAME,
    routingKey: RoutingKey.GUILDS_MEMBERS_REMOVE_DLQ,
    queue: Queue.GUILDS_MEMBERS_REMOVE_DLQ,
    queueOptions: {
      durable: true,
    },
  })
  async handleDeleteMemberDLQ(data: DeleteMemberDto, amqpMsg: any) {
    console.error('Message sent to DLQ - Delete Member:', {
      data,
      retryCount: this.retryService.getRetryCount(
        amqpMsg.properties.headers || {},
      ),
      headers: amqpMsg.properties.headers,
    });
  }

  @RabbitSubscribe({
    exchange: DEAD_LETTER_EXCHANGE_NAME,
    routingKey: RoutingKey.GUILDS_MEMBERS_ADD_ROLE_DLQ,
    queue: Queue.GUILDS_MEMBERS_ADD_ROLE_DLQ,
    queueOptions: {
      durable: true,
    },
  })
  async handleAddMemberRoleDLQ(data: AddMemberRoleDto, amqpMsg: any) {
    console.error('Message sent to DLQ - Add Member Role:', {
      data,
      retryCount: this.retryService.getRetryCount(
        amqpMsg.properties.headers || {},
      ),
      headers: amqpMsg.properties.headers,
    });
  }

  @RabbitSubscribe({
    exchange: DEAD_LETTER_EXCHANGE_NAME,
    routingKey: RoutingKey.GUILDS_MEMBERS_REMOVE_ROLE_DLQ,
    queue: Queue.GUILDS_MEMBERS_REMOVE_ROLE_DLQ,
    queueOptions: {
      durable: true,
    },
  })
  async handleDeleteMemberRoleDLQ(data: DeleteMemberRoleDto, amqpMsg: any) {
    console.error('Message sent to DLQ - Delete Member Role:', {
      data,
      retryCount: this.retryService.getRetryCount(
        amqpMsg.properties.headers || {},
      ),
      headers: amqpMsg.properties.headers,
    });
  }
}
