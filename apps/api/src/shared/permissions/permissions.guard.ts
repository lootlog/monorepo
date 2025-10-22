import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from './permissions.decorator';
import { GuildsService } from 'src/guilds/guilds.service';
import { Permission } from 'generated/client';
import { RedisService } from 'src/lib/redis/redis.service';
import {
  getPermissionsCacheKey,
  PERMISSIONS_CACHE_TTL_SECONDS,
} from 'src/shared/constants/cache.constant';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private guildsService: GuildsService,
    private redisService: RedisService,
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

    const cacheKey = getPermissionsCacheKey(userId, guildId);
    const cached = await this.redisService.get(cacheKey);

    if (cached) {
      const data = JSON.parse(cached);
      const permissionsSet = new Set(data.permissions);
      const hasPermission = requiredPermissions.some((permission) =>
        permissionsSet.has(permission),
      );

      if (!hasPermission) {
        return false;
      }

      request.permissions = data.permissions;
      request.guild = data.guild;
      request.roles = data.roles;
      request.member = data.member;

      return true;
    }

    const { permissions, guild, roles, member } =
      await this.guildsService.getGuildPermissions({
        discordId,
        userId,
        guildId,
      });

    if (!permissions) {
      return false;
    }

    const permissionsSet = new Set(permissions);
    const hasPermission = requiredPermissions.some((permission) =>
      permissionsSet.has(permission),
    );

    if (!hasPermission) {
      return false;
    }

    await this.redisService.set(
      cacheKey,
      JSON.stringify({ permissions, guild, roles, member }),
      PERMISSIONS_CACHE_TTL_SECONDS,
    );

    request.permissions = permissions;
    request.guild = guild;
    request.roles = roles;
    request.member = member;

    return true;
  }
}
