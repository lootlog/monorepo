import {
  Injectable,
  Optional,
  type CanActivate,
  type ExecutionContext,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { PERMISSIONS_KEY } from "./permissions.decorator.js";
import { MemberContextService } from "./member-context.service.js";
import type { Permission } from "#src/db/domain";
import { PerfDiagnosticsService } from "#src/shared/diagnostics/perf-diagnostics.service";
import { setRequestDiagnosticsRoute } from "#src/shared/diagnostics/request-diagnostics-context";
import { PermissionResolver } from "./permission-resolver.js";

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
    @Optional()
    private readonly perfDiagnosticsService?: PerfDiagnosticsService,
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
    const controller = context.getClass();
    const handler = context.getHandler();
    setRequestDiagnosticsRoute(
      `${controller?.name ?? "UnknownController"}.${
        handler?.name ?? "unknownHandler"
      }`,
    );

    const {
      userId,
      discordId,
      params: { guildId },
    } = request;

    if (!userId || !guildId) {
      return false;
    }

    const startedAt = this.perfDiagnosticsService?.now();

    return this.verifyPermissions({
      requiredPermissions,
      discordId,
      userId,
      guildId,
      request,
    })
      .then((allowed) => {
        if (startedAt !== undefined) {
          this.perfDiagnosticsService?.logSpan(
            "permissions.guard",
            this.perfDiagnosticsService.now() - startedAt,
            {
              allowed,
              guildId,
              requiredPermissionsCount: requiredPermissions.length,
            },
          );
        }

        return allowed;
      })
      .catch((error) => {
        if (startedAt !== undefined) {
          this.perfDiagnosticsService?.logSpan(
            "permissions.guard",
            this.perfDiagnosticsService.now() - startedAt,
            {
              errorName: (error as Error).name,
              guildId,
              outcome: "error",
              requiredPermissionsCount: requiredPermissions.length,
            },
          );
        }

        throw error;
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
    const resolvedPermissions = PermissionResolver.resolve(permissions);

    const permissionsSet = new Set(resolvedPermissions);
    const hasPermission = requiredPermissions.some((permission) =>
      permissionsSet.has(permission),
    );

    if (!hasPermission) {
      return false;
    }

    request.permissions = resolvedPermissions;
    request.guild = guild;
    request.roles = roles;
    request.member = member;

    return true;
  }
}
