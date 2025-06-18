import {
  MessageHandlerErrorBehavior,
  RabbitSubscribe,
} from '@golevelup/nestjs-rabbitmq';
import { Injectable } from '@nestjs/common';
import { AddMemberRoleDto } from 'src/gateway/dto/add-member-role.dto';
import { AddMemberDto } from 'src/gateway/dto/add-member.dto';
import { CreateTimerDto } from 'src/gateway/dto/create-timer.dto';
import { DeleteMemberRoleDto } from 'src/gateway/dto/delete-member-role.dto';
import { DeleteMemberDto } from 'src/gateway/dto/delete-member.dto';
import { DeleteTimerDto } from 'src/gateway/dto/delete-timer.dto';
import { SendMessageDto } from 'src/gateway/dto/send-message.dto';
import { Queue } from 'src/gateway/enums/queue.enum';
import { RoutingKey } from 'src/gateway/enums/routing-key.enum';
import { GatewayService } from 'src/gateway/gateway.service';

@Injectable()
export class GatewayQueueHandler {
  constructor(private readonly gatewayService: GatewayService) {}

  @RabbitSubscribe({
    exchange: 'default',
    routingKey: RoutingKey.GUILDS_TIMERS_UPDATE,
    queue: Queue.GUILDS_TIMERS_UPDATE,
    errorBehavior: MessageHandlerErrorBehavior.NACK,
  })
  async handleGuildsTimerUpdate(data: CreateTimerDto) {
    this.gatewayService.handleGuildsTimerUpdate(data);
  }

  @RabbitSubscribe({
    exchange: 'default',
    routingKey: RoutingKey.GUILDS_TIMERS_DELETE,
    queue: Queue.GUILDS_TIMERS_DELETE,
    errorBehavior: MessageHandlerErrorBehavior.NACK,
  })
  async handleGuildsTimerDelete(data: DeleteTimerDto) {
    this.gatewayService.handleGuildsTimerDelete(data);
  }

  @RabbitSubscribe({
    exchange: 'default',
    routingKey: RoutingKey.GUILDS_SEND_MESSAGE,
    queue: Queue.GUILDS_SEND_MESSAGE,
    errorBehavior: MessageHandlerErrorBehavior.NACK,
  })
  async handleGuildMessageSend(data: SendMessageDto) {
    this.gatewayService.handleGuildMessageSend(data);
  }

  @RabbitSubscribe({
    exchange: 'default',
    routingKey: RoutingKey.GUILDS_MEMBERS_ADD,
    queue: Queue.GUILDS_MEMBERS_ADD,
    errorBehavior: MessageHandlerErrorBehavior.NACK,
  })
  async handleAddMember(data: AddMemberDto) {
    return this.gatewayService.invalidatePlayerCache(data.id);
  }

  @RabbitSubscribe({
    exchange: 'default',
    routingKey: RoutingKey.GUILDS_MEMBERS_UPDATE,
    queue: Queue.GUILDS_MEMBERS_UPDATE,
    errorBehavior: MessageHandlerErrorBehavior.NACK,
  })
  async handleUpdateMember(data: AddMemberDto) {
    return this.gatewayService.invalidatePlayerCache(data.id);
  }

  @RabbitSubscribe({
    exchange: 'default',
    routingKey: RoutingKey.GUILDS_MEMBERS_REMOVE,
    queue: Queue.GUILDS_MEMBERS_REMOVE,
    errorBehavior: MessageHandlerErrorBehavior.NACK,
  })
  async handleDeleteMember(data: DeleteMemberDto) {
    return this.gatewayService.invalidatePlayerCache(data.id);
  }

  @RabbitSubscribe({
    exchange: 'default',
    routingKey: RoutingKey.GUILDS_MEMBERS_ADD_ROLE,
    queue: Queue.GUILDS_MEMBERS_ADD_ROLE,
    errorBehavior: MessageHandlerErrorBehavior.NACK,
  })
  async handleAddMemberRole(data: AddMemberRoleDto) {
    return this.gatewayService.invalidatePlayerCache(data.id);
  }

  @RabbitSubscribe({
    exchange: 'default',
    routingKey: RoutingKey.GUILDS_MEMBERS_REMOVE_ROLE,
    queue: Queue.GUILDS_MEMBERS_REMOVE_ROLE,
    errorBehavior: MessageHandlerErrorBehavior.NACK,
  })
  async handleDeleteMemberRole(data: DeleteMemberRoleDto) {
    return this.gatewayService.invalidatePlayerCache(data.id);
  }
}
