import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from './permissions.decorator';
import { GuildsService } from 'src/guilds/guilds.service';
import { Permission } from 'generated/client';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private guildsService: GuildsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.getAllAndOverride<Permission[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!requiredPermissions) {
      return true;
    }

    const request = context.switchToHttp().getRequest();

    const {
      userId,
      discordId,
      params: { guildId },
    } = request;

    if (!userId || !guildId) {
      return false;
    }

    return this.verifyPermissions(
      requiredPermissions,
      discordId,
      guildId,
      request,
    );
  }

  async verifyPermissions(
    requiredPermissions: Permission[],
    discordId: string,
    guildId: string,
    request: any,
  ) {
    const permissions = await this.guildsService.getGuildPermissions(
      discordId,
      guildId,
    );

    if (!permissions) {
      return false;
    }

    const hasPermission = requiredPermissions.every((permission) =>
      permissions.data.includes(permission),
    );

    if (!hasPermission) {
      return false;
    }

    request.permissions = permissions.data;
    request.guild = permissions.guild;

    return true;
  }

  async verifyManageable(userId: string, guildId: string) {
    // const manageable = await this.discordService.getManageableDiscordGuild(
    //   userId,
    //   guildId,
    // );
    const manageable = true;

    return !!manageable;
  }
}
