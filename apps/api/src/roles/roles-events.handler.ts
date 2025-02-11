import {
  MessageHandlerErrorBehavior,
  RabbitSubscribe,
} from '@golevelup/nestjs-rabbitmq';
import { Injectable } from '@nestjs/common';
import { CreateRoleDto } from 'src/roles/dto/create-role.dto';
import { DeleteRoleDto } from 'src/roles/dto/delete-role.dto';
import { UpdateRoleDto } from 'src/roles/dto/update-role.dto';
import { Queue } from 'src/roles/enum/queue.enum';
import { RoutingKey } from 'src/roles/enum/routing-key.enum';
import { RolesService } from 'src/roles/roles.service';

@Injectable()
export class RolesEventsHandler {
  constructor(private readonly rolesService: RolesService) {}

  @RabbitSubscribe({
    exchange: 'default',
    routingKey: RoutingKey.GUILDS_CREATE_ROLE,
    queue: Queue.GUILDS_CREATE_ROLE,
    errorBehavior: MessageHandlerErrorBehavior.NACK,
  })
  async handleRoleCreate(data: CreateRoleDto) {
    return this.rolesService.createRole(data);
  }

  @RabbitSubscribe({
    exchange: 'default',
    routingKey: RoutingKey.GUILDS_UPDATE_ROLE,
    queue: Queue.GUILDS_UPDATE_ROLE,
    errorBehavior: MessageHandlerErrorBehavior.NACK,
  })
  async handleRoleUpdate(data: UpdateRoleDto) {
    return this.rolesService.updateRole(data);
  }

  @RabbitSubscribe({
    exchange: 'default',
    routingKey: RoutingKey.GUILDS_DELETE_ROLE,
    queue: Queue.GUILDS_DELETE_ROLE,
    errorBehavior: MessageHandlerErrorBehavior.NACK,
  })
  async handleRoleDelete(data: DeleteRoleDto) {
    return this.rolesService.deleteRole(data);
  }
}
