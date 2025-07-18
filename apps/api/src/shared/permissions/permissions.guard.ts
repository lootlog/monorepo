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

    console.log(userId, guildId);

    return this.verifyPermissions({
      requiredPermissions,
      discordId,
      userId,
      guildId,
      request,
    });
  }

  async verifyPermissions(options: {
    requiredPermissions: Permission[];
    discordId: string;
    guildId: string;
    userId: string;
    request: any;
  }) {
    const { requiredPermissions, discordId, guildId, userId, request } =
      options;

    const { permissions, guild, roles } =
      await this.guildsService.getGuildPermissions({
        discordId,
        userId,
        guildId,
      });

    if (!permissions) {
      return false;
    }

    const hasPermission = requiredPermissions.every((permission) =>
      permissions.includes(permission),
    );

    if (!hasPermission) {
      return false;
    }

    request.permissions = permissions;
    request.guild = guild;
    request.roles = roles;

    return true;
  }
}
