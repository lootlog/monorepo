import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { REQUIRED_PERMISSIONS_KEY } from '@lootlog/nest-shared';
import { PermissionsService } from 'src/permissions/permissions.service';
import { Permission } from '@lootlog/types';

@Injectable()
export class PermissionsGuard implements CanActivate {
  private readonly logger = new Logger(PermissionsGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly permissionsService: PermissionsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.getAllAndOverride<Permission[]>(
      REQUIRED_PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const { userId, discordId, params } = request;

    const guildId = params?.guildId;

    if (!guildId) {
      this.logger.log({
        level: 'warn',
        message: 'Missing guildId in request params',
        userId,
        discordId,
      });
      throw new ForbiddenException('Guild ID is required');
    }

    const userPermissions =
      await this.permissionsService.getUserGuildPermissions(
        discordId,
        userId,
        guildId,
      );

    const hasPermission = requiredPermissions.some((permission) =>
      userPermissions.includes(permission),
    );

    if (!hasPermission) {
      this.logger.log({
        level: 'warn',
        message: 'User lacks required permissions',
        userId,
        discordId,
        guildId,
        requiredPermissions,
        userPermissions,
      });
      throw new ForbiddenException('Insufficient permissions');
    }

    return true;
  }
}
