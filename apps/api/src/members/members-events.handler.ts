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
import { RoutingKey } from 'src/members/enum/routing-key.enum';
import { Queue } from 'src/members/enum/queue.enum';

@Injectable()
export class MembersEventsHandler {
  constructor(private readonly membersService: MembersService) {}

  @RabbitSubscribe({
    exchange: 'default',
    routingKey: RoutingKey.GUILDS_MEMBERS_ADD,
    queue: Queue.GUILDS_MEMBERS_ADD,
    errorBehavior: MessageHandlerErrorBehavior.NACK,
  })
  async handleAddMember(data: AddMemberDto) {
    // return this.membersService.addMember(data);
  }

  @RabbitSubscribe({
    exchange: 'default',
    routingKey: RoutingKey.GUILDS_MEMBERS_UPDATE,
    queue: Queue.GUILDS_MEMBERS_UPDATE,
    errorBehavior: MessageHandlerErrorBehavior.NACK,
  })
  async handleUpdateMember(data: AddMemberDto) {
    return this.membersService.updateMember(data);
  }

  @RabbitSubscribe({
    exchange: 'default',
    routingKey: RoutingKey.GUILDS_MEMBERS_REMOVE,
    queue: Queue.GUILDS_MEMBERS_REMOVE,
    errorBehavior: MessageHandlerErrorBehavior.NACK,
  })
  async handleDeleteMember(data: DeleteMemberDto) {
    return this.membersService.deleteMember(data);
  }

  @RabbitSubscribe({
    exchange: 'default',
    routingKey: RoutingKey.GUILDS_MEMBERS_ADD_ROLE,
    queue: Queue.GUILDS_MEMBERS_ADD_ROLE,
    errorBehavior: MessageHandlerErrorBehavior.NACK,
  })
  async handleAddMemberRole(data: AddMemberRoleDto) {
    return this.membersService.addMemberRole(data);
  }

  @RabbitSubscribe({
    exchange: 'default',
    routingKey: RoutingKey.GUILDS_MEMBERS_REMOVE_ROLE,
    queue: Queue.GUILDS_MEMBERS_REMOVE_ROLE,
    errorBehavior: MessageHandlerErrorBehavior.NACK,
  })
  async handleDeleteMemberRole(data: DeleteMemberRoleDto) {
    return this.membersService.deleteMemberRole(data);
  }
}
