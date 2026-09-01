import { createAccessPolicy, type Capability } from "@lootlog/access-policy";
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { REQUIRED_CAPABILITIES_KEY } from "@lootlog/nest-shared";
import { PermissionsService } from "#src/permissions/permissions.service";

@Injectable()
export class PermissionsGuard implements CanActivate {
  private readonly logger = new Logger(PermissionsGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly permissionsService: PermissionsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredCapabilities = this.reflector.getAllAndOverride<Capability[]>(
      REQUIRED_CAPABILITIES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredCapabilities || requiredCapabilities.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const { userId, discordId, params } = request;

    const guildId = params?.guildId;

    if (!guildId) {
      this.logger.log({
        level: "warn",
        message: "Missing guildId in request params",
        userId,
        discordId,
      });
      throw new ForbiddenException("Guild ID is required");
    }

    const resolvedGuildId =
      await this.permissionsService.resolveGuildId(guildId);

    if (!resolvedGuildId) {
      this.logger.log({
        level: "warn",
        message: "Guild could not be resolved from request params",
        userId,
        discordId,
        guildId,
      });
      throw new ForbiddenException("Insufficient permissions");
    }

    request.params.guildId = resolvedGuildId;

    const capabilityGrants =
      await this.permissionsService.getUserGuildPermissions(
        discordId,
        userId,
        resolvedGuildId,
      );

    const accessPolicy = createAccessPolicy({ capabilities: capabilityGrants });

    if (!accessPolicy.allowsAny(requiredCapabilities)) {
      this.logger.log({
        level: "warn",
        message: "User lacks required capabilities",
        userId,
        discordId,
        guildId: resolvedGuildId,
        requiredCapabilities,
        capabilityGrants,
      });
      throw new ForbiddenException("Insufficient permissions");
    }

    return true;
  }
}
