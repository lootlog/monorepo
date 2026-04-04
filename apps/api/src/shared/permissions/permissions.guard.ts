import {
  Injectable,
  type CanActivate,
  type ExecutionContext,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { PERMISSIONS_KEY } from "./permissions.decorator";
import { MemberContextService } from "./member-context.service";
import type { Permission } from "src/generated/prisma/client";

interface RequestWithPermissions {
  userId?: string;
  discordId?: string;
  params: { guildId?: string };
  permissions?: Permission[];
  guild?: unknown;
  roles?: unknown[];
  member?: unknown;
}

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private memberContextService: MemberContextService,
  ) {}

  canActivate(context: ExecutionContext): Promise<boolean> | boolean {
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
    request: RequestWithPermissions;
  }) {
    const {
      requiredPermissions = [],
      discordId,
      guildId,
      userId,
      request,
    } = options;

    const context = await this.memberContextService.getMemberContext({
      discordId,
      userId,
      guildId,
    });

    if (!context) {
      return false;
    }

    const { guild, member, roles, permissions } = context;

    const permissionsSet = new Set(permissions);
    const hasPermission = requiredPermissions.some((permission) =>
      permissionsSet.has(permission),
    );

    if (!hasPermission) {
      return false;
    }

    request.permissions = permissions;
    request.guild = guild;
    request.roles = roles;
    request.member = member;

    return true;
  }
}
