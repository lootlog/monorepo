import { Capability, createAccessPolicy } from "@lootlog/domain/access-policy";
import {
  ForbiddenException,
  NotFoundException,
} from "#src/shared/http/http-errors";
import { Permission } from "@lootlog/schema/permissions";
import type { ApplicationLogger as Logger } from "#src/shared/logging/application-logger";
import type { GuildRoleDto } from "#src/guilds/dto/create-guild.dto";
import type { CreateRoleDto } from "#src/roles/dto/create-role.dto";
import type { DeleteRoleDto } from "#src/roles/dto/delete-role.dto";
import type { UpdateRolePermissionsDto } from "#src/roles/dto/update-role-permissions.dto";
import { RedisService } from "#src/redis/redis.service";
import { getPermissionsCachePattern } from "#src/shared/constants/cache.constant";
import { RolesRepository } from "./roles.repository.js";

export class RolesService {
  constructor(
    private readonly repository: RolesRepository,
    private readonly logger: Logger,
    private readonly redisService: RedisService,
  ) {}

  private getAdminPermissions(admin: boolean): Permission[] {
    return admin
      ? Object.values(Permission).filter((p) => p !== Permission.OWNER)
      : [];
  }

  getRolesByGuildId(guildId: string) {
    return this.repository.findByGuildId(guildId);
  }

  bulkCreateRoles(
    guildId: string,
    roles: GuildRoleDto[],
  ): Promise<{ count: number } | undefined> {
    try {
      return this.repository.bulkCreate(
        roles.map(({ id, name, color, admin, position }) => ({
          id,
          guildId,
          name,
          color,
          position,
          permissions: this.getAdminPermissions(admin),
        })),
      );
    } catch (error) {
      this.logger.log({
        level: "error",
        message: "Failed to bulk create roles",
        guildId,
        error: error instanceof Error ? error.stack : error,
      });
    }
  }

  async createOrUpdateRole(data: CreateRoleDto) {
    const permissions = this.getAdminPermissions(data.admin);

    try {
      const existingRole = await this.repository.findById(
        data.id,
        data.guildId,
      );

      const updateData: {
        name: string;
        color: number | null;
        position: number | null;
        permissions?: Permission[];
      } = {
        name: data.name,
        color: data.color,
        position: data.position,
      };

      const roleIsAdministrative = existingRole
        ? createAccessPolicy({
            capabilities: existingRole.permissions,
          }).allows(Capability.ADMIN)
        : false;

      if (existingRole && roleIsAdministrative !== data.admin) {
        updateData.permissions = permissions;
      }

      await this.repository.upsert(
        {
          id: data.id,
          guildId: data.guildId,
          name: data.name,
          color: data.color,
          position: data.position,
          permissions,
        },
        updateData,
      );

      await this.redisService.deleteByPattern(
        getPermissionsCachePattern(data.guildId),
      );
    } catch (error) {
      this.logger.log({
        level: "error",
        message: "Failed to create or update role",
        roleId: data.id,
        guildId: data.guildId,
        error: error instanceof Error ? error.stack : error,
      });
    }
  }

  async updateRolePermissions(
    discordId: string,
    guildId: string,
    roleId: string,
    data: UpdateRolePermissionsDto,
  ) {
    const role = await this.repository.findById(roleId, guildId);

    if (!role) {
      throw new NotFoundException();
    }

    const guildOwnerId = await this.repository.findGuildOwnerId(guildId);
    const isOwner = guildOwnerId === discordId;

    const roleIsAdministrative = createAccessPolicy({
      capabilities: role.permissions,
    }).allows(Capability.ADMIN);
    const newPermissionsAreAdministrative = createAccessPolicy({
      capabilities: data.permissions,
    }).allows(Capability.ADMIN);
    const isAdministrativePermissionChanging =
      roleIsAdministrative !== newPermissionsAreAdministrative;

    if (isAdministrativePermissionChanging && !isOwner) {
      throw new ForbiddenException();
    }

    const updatedRole = await this.repository.updatePermissions(
      roleId,
      guildId,
      data.permissions,
      data.lvlRangeFrom,
      data.lvlRangeTo,
    );

    await this.redisService.deleteByPattern(
      getPermissionsCachePattern(guildId),
    );

    return updatedRole;
  }

  async deleteRole(data: DeleteRoleDto) {
    const role = await this.repository.findById(data.id, data.guildId);

    if (!role) {
      return;
    }

    await this.repository.deleteById(data.id, data.guildId);

    await this.redisService.deleteByPattern(
      getPermissionsCachePattern(data.guildId),
    );
  }

  async deleteRolesByGuildId(guildId: string) {
    try {
      await this.repository.deleteByGuildId(guildId);

      await this.redisService.deleteByPattern(
        getPermissionsCachePattern(guildId),
      );
    } catch (error) {
      this.logger.log({
        level: "error",
        message: "Failed to delete roles by guild ID",
        guildId,
        error: error instanceof Error ? error.stack : error,
      });
    }
  }
}
