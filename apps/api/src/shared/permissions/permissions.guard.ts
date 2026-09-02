import {
  createAccessPolicy,
  getEffectiveCapabilities,
  type AccessPolicy,
  type Capability,
} from "@lootlog/domain/access-policy";
import { REQUIRED_CAPABILITIES_KEY } from "@lootlog/nest-shared";
import {
  Injectable,
  Optional,
  type CanActivate,
  type ExecutionContext,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { MemberContextService } from "./member-context.service.js";
import { PerfDiagnosticsService } from "#src/shared/diagnostics/perf-diagnostics.service";
import { setRequestDiagnosticsRoute } from "#src/shared/diagnostics/request-diagnostics-context";

interface RequestWithAccessPolicy {
  userId?: string;
  discordId?: string;
  params: { guildId?: string };
  accessPolicy?: AccessPolicy;
  permissions?: Capability[];
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
    const requiredCapabilities = this.reflector.getAllAndOverride<Capability[]>(
      REQUIRED_CAPABILITIES_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!requiredCapabilities) {
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

    return this.verifyCapabilities({
      requiredCapabilities,
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
              requiredCapabilitiesCount: requiredCapabilities.length,
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
              requiredCapabilitiesCount: requiredCapabilities.length,
            },
          );
        }

        throw error;
      });
  }

  async verifyCapabilities(options: {
    requiredCapabilities: Capability[];
    discordId: string;
    guildId: string;
    userId: string;
    request: RequestWithAccessPolicy;
  }) {
    const {
      requiredCapabilities = [],
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
    const accessPolicy = createAccessPolicy({ capabilities: permissions });

    if (!accessPolicy.allowsAny(requiredCapabilities)) {
      return false;
    }

    request.accessPolicy = accessPolicy;
    request.permissions = getEffectiveCapabilities(accessPolicy);
    request.guild = guild;
    request.roles = roles;
    request.member = member;

    return true;
  }
}
