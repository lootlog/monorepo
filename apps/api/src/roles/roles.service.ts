import { db as prismaDb } from "#src/prisma/db";
import type { Contract } from "../prisma/contract.js";
import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import type { Pool } from "pg";
import type { Logger } from "winston";
import { POSTGRES_POOL } from "#src/db/postgres.provider";
import { withPostgresTransaction } from "#src/db/postgres-transaction";
import type { GuildRoleDto } from "#src/guilds/dto/create-guild.dto";
import type { CreateRoleDto } from "#src/roles/dto/create-role.dto";
import type { DeleteRoleDto } from "#src/roles/dto/delete-role.dto";
import type { UpdateRolePermissionsDto } from "#src/roles/dto/update-role-permissions.dto";
import { RedisService } from "@lootlog/nest-shared/redis";
import { getPermissionsCachePattern } from "#src/shared/constants/cache.constant";
import { PermissionResolver } from "#src/shared/permissions/permission-resolver";

const Permission = prismaDb.nativeEnums.public.Permission.members;
type Permission =
  Contract["storage"]["namespaces"]["public"]["entries"]["valueSet"]["Permission"]["values"][number];
type PermissionValue =
  Contract["storage"]["namespaces"]["public"]["entries"]["valueSet"]["Permission"]["values"][number];

type RoleRow = {
  id: string;
  guildId: string;
  name: string;
  color: number | null;
  position: number | null;
  permissions: PermissionValue[] | null;
  createdAt: Date;
  updatedAt: Date;
  lvlRangeFrom: number | null;
  lvlRangeTo: number | null;
};

@Injectable()
export class RolesService {
  constructor(
    @Inject(POSTGRES_POOL) private readonly postgres: Pool,
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
    const roles = await this.postgres.query<RoleRow>(
      `SELECT "id", "guildId", "name", "color", "position", "permissions",
              "createdAt", "updatedAt", "lvlRangeFrom", "lvlRangeTo"
       FROM "Role"
       WHERE "guildId" = $1
       ORDER BY "position" DESC`,
      [guildId],
    );
    return roles.rows;
  }

  async bulkCreateRoles(
    guildId: string,
    roles: GuildRoleDto[],
  ): Promise<{ count: number } | undefined> {
    try {
      const count = await withPostgresTransaction(
        this.postgres,
        async (transaction) => {
          let createdCount = 0;
          for (const role of roles) {
            const created = await transaction.query(
              `INSERT INTO "Role"
                 ("id", "guildId", "name", "color", "position", "permissions",
                  "createdAt", "updatedAt", "lvlRangeFrom", "lvlRangeTo")
               VALUES ($1, $2, $3, $4, $5, $6::"Permission"[], NOW(), NOW(), 0, 500)
               ON CONFLICT ("id") DO NOTHING`,
              [
                role.id,
                guildId,
                role.name,
                role.color,
                role.position,
                this.getAdminPermissions(role.admin),
              ],
            );
            createdCount += created.rowCount ?? 0;
          }
          return createdCount;
        },
      );
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
      const existingRole = await this.postgres.query<
        Pick<RoleRow, "permissions">
      >(`SELECT "permissions" FROM "Role" WHERE "id" = $1 AND "guildId" = $2`, [
        data.id,
        data.guildId,
      ]);
      const existingPermissions = existingRole.rows[0]?.permissions;
      const roleIsAdministrative = existingPermissions
        ? PermissionResolver.isAdministrative(existingPermissions)
        : false;
      const shouldUpdatePermissions =
        existingPermissions !== undefined &&
        roleIsAdministrative !== data.admin;

      await this.postgres.query(
        `INSERT INTO "Role"
           ("id", "guildId", "name", "color", "position", "permissions",
            "createdAt", "updatedAt", "lvlRangeFrom", "lvlRangeTo")
         VALUES ($1, $2, $3, $4, $5, $6::"Permission"[], NOW(), NOW(), 0, 500)
         ON CONFLICT ("id") DO UPDATE SET
           "name" = EXCLUDED."name",
           "color" = EXCLUDED."color",
           "position" = EXCLUDED."position",
           "permissions" = CASE
             WHEN $7::boolean THEN EXCLUDED."permissions"
             ELSE "Role"."permissions"
           END,
           "updatedAt" = NOW()`,
        [
          data.id,
          data.guildId,
          data.name,
          data.color,
          data.position,
          permissions,
          shouldUpdatePermissions,
        ],
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
    const role = await this.findRole(roleId, guildId);
    if (!role) {
      throw new NotFoundException();
    }

    const guild = await this.postgres.query<{ ownerId: string }>(
      `SELECT "ownerId" FROM "Guild" WHERE "id" = $1`,
      [guildId],
    );
    const isOwner = guild.rows[0]?.ownerId === discordId;
    const roleIsAdministrative = PermissionResolver.isAdministrative(
      role.permissions,
    );
    const newPermissionsAreAdministrative = PermissionResolver.isAdministrative(
      data.permissions,
    );

    if (roleIsAdministrative !== newPermissionsAreAdministrative && !isOwner) {
      throw new ForbiddenException();
    }

    const updated = await this.postgres.query<RoleRow>(
      `UPDATE "Role"
       SET "permissions" = $2::"Permission"[],
           "lvlRangeFrom" = $3,
           "lvlRangeTo" = $4,
           "updatedAt" = NOW()
       WHERE "id" = $1
       RETURNING "id", "guildId", "name", "color", "position", "permissions",
                 "createdAt", "updatedAt", "lvlRangeFrom", "lvlRangeTo"`,
      [roleId, data.permissions, data.lvlRangeFrom, data.lvlRangeTo],
    );

    await this.redisService.deleteByPattern(
      getPermissionsCachePattern(guildId),
    );
    return updated.rows[0];
  }

  async deleteRole(data: DeleteRoleDto) {
    const role = await this.findRole(data.id, data.guildId);
    if (!role) {
      return;
    }

    await this.postgres.query(`DELETE FROM "Role" WHERE "id" = $1`, [data.id]);
    await this.redisService.deleteByPattern(
      getPermissionsCachePattern(data.guildId),
    );
  }

  async deleteRolesByGuildId(guildId: string) {
    try {
      await this.postgres.query(`DELETE FROM "Role" WHERE "guildId" = $1`, [
        guildId,
      ]);
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
    const role = await this.postgres.query<RoleRow>(
      `SELECT "id", "guildId", "name", "color", "position", "permissions",
              "createdAt", "updatedAt", "lvlRangeFrom", "lvlRangeTo"
       FROM "Role"
       WHERE "id" = $1 AND "guildId" = $2`,
      [roleId, guildId],
    );
    return role.rows[0] ?? null;
  }
}
