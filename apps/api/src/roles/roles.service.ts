import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Permission, type Prisma } from "src/generated/prisma/client";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import type { Logger } from "winston";
import { PrismaService } from "src/db/prisma.service";
import type { GuildRoleDto } from "src/guilds/dto/create-guild.dto";
import type { CreateRoleDto } from "src/roles/dto/create-role.dto";
import type { DeleteRoleDto } from "src/roles/dto/delete-role.dto";
import type { UpdateRolePermissionsDto } from "src/roles/dto/update-role-permissions.dto";
import { RedisService } from "@lootlog/nest-shared/redis";
import { getPermissionsCachePattern } from "src/shared/constants/cache.constant";
import { PermissionResolver } from "src/shared/permissions/permission-resolver";

@Injectable()
export class RolesService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    private readonly redisService: RedisService,
  ) {}

  private getAdminPermissions(admin: boolean): Permission[] {
    return admin
      ? Object.values(Permission).filter((p) => p !== Permission.OWNER)
      : [];
  }

  async getRolesByGuildId(guildId: string) {
    const roles = await this.prisma.role.findMany({
      where: { guildId },
      orderBy: { position: "desc" },
    });

    return roles;
  }

  bulkCreateRoles(
    guildId: string,
    roles: GuildRoleDto[],
  ): Promise<Prisma.BatchPayload | undefined> {
    try {
      return this.prisma.role.createMany({
        skipDuplicates: true,
        data: roles.map(({ id, name, color, admin, position }) => ({
          id,
          guildId,
          name,
          color,
          position,
          permissions: this.getAdminPermissions(admin),
        })),
      });
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
      const existingRole = await this.prisma.role.findUnique({
        where: { id: data.id, guildId: data.guildId },
        select: { permissions: true },
      });

      const updateData: Prisma.RoleUpdateInput = {
        name: data.name,
        color: data.color,
        position: data.position,
      };

      const roleIsAdministrative = existingRole
        ? PermissionResolver.isAdministrative(existingRole.permissions)
        : false;

      if (existingRole && roleIsAdministrative !== data.admin) {
        updateData.permissions = permissions;
      }

      await this.prisma.role.upsert({
        where: { id: data.id },
        update: updateData,
        create: {
          id: data.id,
          guildId: data.guildId,
          name: data.name,
          color: data.color,
          position: data.position,
          permissions,
        },
      });

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
    const role = await this.prisma.role.findUnique({
      where: { id: roleId, guildId },
    });

    if (!role) {
      throw new NotFoundException();
    }

    const guild = await this.prisma.guild.findUnique({
      where: { id: guildId },
    });

    const isOwner = guild.ownerId === discordId;

    const roleIsAdministrative = PermissionResolver.isAdministrative(
      role.permissions,
    );
    const newPermissionsAreAdministrative = PermissionResolver.isAdministrative(
      data.permissions,
    );
    const isAdministrativePermissionChanging =
      roleIsAdministrative !== newPermissionsAreAdministrative;

    if (isAdministrativePermissionChanging && !isOwner) {
      throw new ForbiddenException();
    }

    const updatedRole = await this.prisma.role.update({
      where: { id: roleId },
      data: {
        permissions: data.permissions,
        lvlRangeFrom: data.lvlRangeFrom,
        lvlRangeTo: data.lvlRangeTo,
      },
    });

    await this.redisService.deleteByPattern(
      getPermissionsCachePattern(guildId),
    );

    return updatedRole;
  }

  async deleteRole(data: DeleteRoleDto) {
    const role = await this.prisma.role.findUnique({
      where: { id: data.id, guildId: data.guildId },
    });

    if (!role) {
      return;
    }

    await this.prisma.role.delete({
      where: { id: data.id },
    });

    await this.redisService.deleteByPattern(
      getPermissionsCachePattern(data.guildId),
    );
  }

  async deleteRolesByGuildId(guildId: string) {
    try {
      await this.prisma.role.deleteMany({
        where: { guildId },
      });

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
