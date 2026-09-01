import { db as prismaDb } from "#src/prisma/db";
import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import type { Logger } from "winston";
import { PrismaService } from "#src/db/prisma.service";
import { dateToTemporal } from "#src/db/temporal";
import type { GuildRoleDto } from "#src/guilds/dto/create-guild.dto";
import type { CreateRoleDto } from "#src/roles/dto/create-role.dto";
import type { DeleteRoleDto } from "#src/roles/dto/delete-role.dto";
import type { UpdateRolePermissionsDto } from "#src/roles/dto/update-role-permissions.dto";
import { RedisService } from "@lootlog/nest-shared/redis";
import { getPermissionsCachePattern } from "#src/shared/constants/cache.constant";
import { PermissionResolver } from "#src/shared/permissions/permission-resolver";

const Permission = prismaDb.nativeEnums.public.Permission.members;
type PermissionValue = (typeof Permission)[keyof typeof Permission];

@Injectable()
export class RolesService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    private readonly redisService: RedisService,
  ) {}

  private getAdminPermissions(admin: boolean): PermissionValue[] {
    return admin
      ? Object.values(Permission).filter(
          (permission) => permission !== Permission.OWNER,
        )
      : [];
  }

  async getRolesByGuildId(guildId: string) {
    const roles = await this.prisma.db.orm.public.Role.where((row) =>
      row.guildId.eq(guildId),
    )
      .orderBy((row) => row.position.desc())
      .all();

    return roles.map((role) => ({
      ...role,
      permissions: [...(role.permissions ?? [])],
    }));
  }

  async bulkCreateRoles(
    guildId: string,
    roles: GuildRoleDto[],
  ): Promise<{ count: number } | undefined> {
    try {
      const count = await this.prisma.db.transaction(async (transaction) => {
        const roleIds = roles.map((role) => role.id);
        const existingRoles =
          roleIds.length === 0
            ? []
            : await transaction.orm.public.Role.where((row) =>
                row.id.in(roleIds),
              )
                .select("id")
                .all();
        const existingRoleIds = new Set(existingRoles.map((role) => role.id));
        const updatedAt = dateToTemporal(new Date());

        for (const role of roles) {
          await transaction.orm.public.Role.where((row) =>
            row.id.eq(role.id),
          ).upsert({
            create: {
              id: role.id,
              guildId,
              name: role.name,
              color: role.color,
              position: role.position,
              permissions: this.getAdminPermissions(role.admin),
              updatedAt,
              lvlRangeFrom: 0,
              lvlRangeTo: 500,
            },
            conflictOn: { id: role.id },
            update: {},
          });
        }

        return roles.filter((role) => !existingRoleIds.has(role.id)).length;
      });
      return { count };
    } catch (error) {
      this.logger.log({
        level: "error",
        message: "Failed to bulk create roles",
        guildId,
        error: error instanceof Error ? error.stack : error,
      });
      return undefined;
    }
  }

  async createOrUpdateRole(data: CreateRoleDto) {
    const permissions = this.getAdminPermissions(data.admin);

    try {
      const existingRole = await this.findRole(data.id, data.guildId);
      const roleIsAdministrative = PermissionResolver.isAdministrative([
        ...(existingRole?.permissions ?? []),
      ]);
      const shouldUpdatePermissions =
        existingRole !== null && roleIsAdministrative !== data.admin;
      const updatedAt = dateToTemporal(new Date());

      await this.prisma.db.orm.public.Role.where((row) =>
        row.id.eq(data.id),
      ).upsert({
        create: {
          id: data.id,
          guildId: data.guildId,
          name: data.name,
          color: data.color,
          position: data.position,
          permissions,
          updatedAt,
          lvlRangeFrom: 0,
          lvlRangeTo: 500,
        },
        conflictOn: { id: data.id },
        update: {
          name: data.name,
          color: data.color,
          position: data.position,
          updatedAt,
          ...(shouldUpdatePermissions ? { permissions } : {}),
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
    const role = await this.findRole(roleId, guildId);
    if (!role) {
      throw new NotFoundException();
    }

    const guild = await this.prisma.db.orm.public.Guild.where((row) =>
      row.id.eq(guildId),
    )
      .select("ownerId")
      .first();
    const isOwner = guild?.ownerId === discordId;
    const roleIsAdministrative = PermissionResolver.isAdministrative([
      ...(role.permissions ?? []),
    ]);
    const newPermissionsAreAdministrative = PermissionResolver.isAdministrative(
      data.permissions,
    );

    if (roleIsAdministrative !== newPermissionsAreAdministrative && !isOwner) {
      throw new ForbiddenException();
    }

    const updated = await this.prisma.db.orm.public.Role.where((row) =>
      row.id.eq(roleId),
    )
      .where((row) => row.guildId.eq(guildId))
      .update({
        permissions: data.permissions,
        lvlRangeFrom: data.lvlRangeFrom,
        lvlRangeTo: data.lvlRangeTo,
        updatedAt: dateToTemporal(new Date()),
      });

    await this.redisService.deleteByPattern(
      getPermissionsCachePattern(guildId),
    );
    return updated;
  }

  async deleteRole(data: DeleteRoleDto) {
    const role = await this.findRole(data.id, data.guildId);
    if (!role) {
      return;
    }

    await this.prisma.db.orm.public.Role.where((row) => row.id.eq(data.id))
      .where((row) => row.guildId.eq(data.guildId))
      .delete();
    await this.redisService.deleteByPattern(
      getPermissionsCachePattern(data.guildId),
    );
  }

  async deleteRolesByGuildId(guildId: string) {
    try {
      await this.prisma.db.orm.public.Role.where((row) =>
        row.guildId.eq(guildId),
      ).deleteAll();
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

  private async findRole(roleId: string, guildId: string) {
    return this.prisma.db.orm.public.Role.where((row) => row.id.eq(roleId))
      .where((row) => row.guildId.eq(guildId))
      .first();
  }
}
