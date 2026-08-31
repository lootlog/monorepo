import { Inject, Injectable } from "@nestjs/common";
import { canViewLoot, type LootVisibilityNpc } from "@lootlog/loot-visibility";
import type { NotificationFilters } from "@lootlog/types";
import type { JsonValue } from "@prisma/orm-postgres/target/codec-types";
import type { Pool } from "pg";
import { Permission, type Permission as PermissionValue } from "#src/db/domain";
import { POSTGRES_POOL } from "#src/db/prisma.provider";

type LootCreatedEvent = {
  lootId: number;
  world: string;
  guildIds: string[];
  itemIds: number[];
  itemNames: string[];
};

type MemberRoleInfo = {
  guildId: string;
  isGuildOwner: boolean;
  roles: {
    id: string;
    permissions: PermissionValue[];
    lvlRangeFrom: number | null;
    lvlRangeTo: number | null;
  }[];
};

@Injectable()
export class NotificationMatchingService {
  constructor(@Inject(POSTGRES_POOL) private readonly postgres: Pool) {}

  matchesTimerRule(filtersValue: JsonValue, npcId: number) {
    const filters = this.parseFilters(filtersValue);

    if (filters.npcId && filters.npcId !== npcId) {
      return false;
    }

    if (filters.npcIds?.length && !filters.npcIds.includes(npcId)) {
      return false;
    }

    return true;
  }

  matchesLootRule(filtersValue: JsonValue, event: LootCreatedEvent) {
    const filters = this.parseFilters(filtersValue);

    if (filters.itemId && !event.itemIds.includes(filters.itemId)) {
      return false;
    }

    if (
      filters.itemIds?.length &&
      !filters.itemIds.some((itemId) => event.itemIds.includes(itemId))
    ) {
      return false;
    }

    if (filters.world && filters.world !== event.world) {
      return false;
    }

    if (
      filters.guildIds?.length &&
      !filters.guildIds.some((guildId) => event.guildIds.includes(guildId))
    ) {
      return false;
    }

    return true;
  }

  parseFilters(filtersValue: JsonValue): NotificationFilters {
    if (
      !filtersValue ||
      typeof filtersValue !== "object" ||
      Array.isArray(filtersValue)
    ) {
      return {};
    }

    return filtersValue as unknown as NotificationFilters;
  }

  getMatchingLootGuildIds(filtersValue: JsonValue, eventGuildIds: string[]) {
    const filters = this.parseFilters(filtersValue);

    if (filters.guildIds?.length) {
      return eventGuildIds.filter((guildId) =>
        filters.guildIds.includes(guildId),
      );
    }

    return [];
  }

  async getActiveMembershipsWithRoles(
    ownerIds: string[],
    guildIds: string[],
  ): Promise<Map<string, MemberRoleInfo[]>> {
    const uniqueOwnerIds = [...new Set(ownerIds)];
    const uniqueGuildIds = [...new Set(guildIds)];
    const result = new Map<string, MemberRoleInfo[]>();

    if (uniqueOwnerIds.length === 0 || uniqueGuildIds.length === 0) {
      return result;
    }

    const memberships = await this.postgres.query<{
      userId: string;
      guildId: string;
      ownerId: string;
      roles: MemberRoleInfo["roles"];
    }>(
      `SELECT
         member."userId",
         member."guildId",
         guild."ownerId",
         COALESCE(
           jsonb_agg(
             jsonb_build_object(
               'id', role."id",
               'permissions', COALESCE(role."permissions", ARRAY[]::"Permission"[]),
               'lvlRangeFrom', role."lvlRangeFrom",
               'lvlRangeTo', role."lvlRangeTo"
             ) ORDER BY role."position" DESC
           ) FILTER (WHERE role."id" IS NOT NULL),
           '[]'::jsonb
         ) AS "roles"
       FROM "Member" AS member
       INNER JOIN "Guild" AS guild ON guild."id" = member."guildId"
       LEFT JOIN "_MemberToRole" AS member_role ON member_role."A" = member."id"
       LEFT JOIN "Role" AS role ON role."id" = member_role."B"
       WHERE member."userId" = ANY($1::text[])
         AND member."guildId" = ANY($2::text[])
         AND member."active" = TRUE
       GROUP BY member."id", guild."ownerId"`,
      [uniqueOwnerIds, uniqueGuildIds],
    );

    for (const membership of memberships.rows) {
      const existing = result.get(membership.userId) ?? [];
      existing.push({
        guildId: membership.guildId,
        isGuildOwner: membership.ownerId === membership.userId,
        roles: membership.roles,
      });
      result.set(membership.userId, existing);
    }

    return result;
  }

  canRolesViewLoot(
    roles: MemberRoleInfo["roles"],
    npcs: readonly LootVisibilityNpc[],
    isGuildOwner?: boolean,
  ): boolean {
    const permissions = isGuildOwner
      ? [Permission.OWNER]
      : roles.flatMap((role) => role.permissions);

    return canViewLoot({
      permissions,
      roles: roles.map((role) => ({
        id: role.id,
        levelFrom: role.lvlRangeFrom ?? 0,
        levelTo: role.lvlRangeTo ?? 500,
        permissions: role.permissions,
      })),
      npcs,
    });
  }
}
