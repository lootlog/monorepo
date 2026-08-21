import {
  evaluateNpcAccess,
  type NpcAccessContext,
  type NpcResource,
  type NpcVisibilityPermissions,
} from "@lootlog/api-helpers/permissions";
import { NpcType, Permission, type Prisma } from "src/generated/prisma/client";

type StrategicRole = {
  permissions: readonly Permission[];
  lvlRangeFrom: number | null;
  lvlRangeTo: number | null;
};

type CreateStrategicAccessContextOptions = {
  organizationId: string;
  ownerId: string;
  viewerDiscordId: string;
  roles: readonly StrategicRole[];
};

export const TIMER_VISIBILITY_PERMISSIONS = {
  base: Permission.LOOTLOG_TIMERS_READ,
  heroes: Permission.LOOTLOG_TIMERS_HEROES_READ,
  titans: Permission.LOOTLOG_TIMERS_TITANS_READ,
} satisfies NpcVisibilityPermissions;

export const LOOT_VISIBILITY_PERMISSIONS = {
  base: Permission.LOOTLOG_LOOTS_READ,
  heroes: Permission.LOOTLOG_LOOTS_HEROES_READ,
  titans: Permission.LOOTLOG_LOOTS_TITANS_READ,
} satisfies NpcVisibilityPermissions;

const DEFAULT_LEVEL_RANGE_FROM = 0;
const DEFAULT_LEVEL_RANGE_TO = 500;

export const createStrategicAccessContext = ({
  organizationId,
  ownerId,
  viewerDiscordId,
  roles,
}: CreateStrategicAccessContextOptions): NpcAccessContext => ({
  organizationId,
  isOwner: ownerId === viewerDiscordId,
  roles: roles.map((role) => ({
    permissions: role.permissions,
    npc: {
      levelRange: {
        from: role.lvlRangeFrom ?? DEFAULT_LEVEL_RANGE_FROM,
        to: role.lvlRangeTo ?? DEFAULT_LEVEL_RANGE_TO,
      },
    },
  })),
});

export const canViewStrategicNpc = (
  context: NpcAccessContext,
  resource: NpcResource,
  visibilityPermissions: NpcVisibilityPermissions,
): boolean =>
  evaluateNpcAccess({ context, resource, visibilityPermissions }).visible;

export const canActOnStrategicNpc = (
  context: NpcAccessContext,
  resource: NpcResource,
  visibilityPermissions: NpcVisibilityPermissions,
  actionPermission: string,
): boolean =>
  evaluateNpcAccess({
    context,
    resource,
    visibilityPermissions,
    actionPermission,
  }).allowed;

const getVisibleRoles = (
  context: NpcAccessContext,
  visibilityPermissions: NpcVisibilityPermissions,
  actionPermission?: string,
) =>
  context.roles.filter(
    (role) =>
      role.permissions.includes(visibilityPermissions.base) &&
      (!actionPermission || role.permissions.includes(actionPermission)),
  );

const getExcludedNpcTypes = (
  permissions: readonly string[],
  visibilityPermissions: NpcVisibilityPermissions,
): NpcType[] => {
  const excludedTypes: NpcType[] = [];

  if (!permissions.includes(visibilityPermissions.titans)) {
    excludedTypes.push(NpcType.TITAN);
  }

  if (!permissions.includes(visibilityPermissions.heroes)) {
    excludedTypes.push(NpcType.HERO, NpcType.EVENT_HERO);
  }

  return excludedTypes;
};

export const buildNpcSnapshotVisibilityWhere = (
  context: NpcAccessContext,
  visibilityPermissions: NpcVisibilityPermissions,
  actionPermission?: string,
): Prisma.NpcSnapshotWhereInput | null => {
  if (context.isOwner) {
    return null;
  }

  const roleConditions = getVisibleRoles(
    context,
    visibilityPermissions,
    actionPermission,
  ).map((role): Prisma.NpcSnapshotWhereInput => {
    const levelRange = role.npc?.levelRange ?? {
      from: DEFAULT_LEVEL_RANGE_FROM,
      to: DEFAULT_LEVEL_RANGE_TO,
    };
    const excludedTypes = getExcludedNpcTypes(
      role.permissions,
      visibilityPermissions,
    );
    const conditions: Prisma.NpcSnapshotWhereInput[] = [
      {
        lvl: {
          gte: levelRange.from,
          lte: levelRange.to,
        },
      },
    ];

    if (excludedTypes.length > 0) {
      conditions.push({ type: { notIn: excludedTypes } });
    }

    return { AND: conditions };
  });

  return { OR: roleConditions };
};

export const buildNpcJsonVisibilityWhere = (
  context: NpcAccessContext,
  visibilityPermissions: NpcVisibilityPermissions,
) => {
  if (context.isOwner) {
    return null;
  }

  const roleConditions = getVisibleRoles(context, visibilityPermissions).map(
    (role) => {
      const levelRange = role.npc?.levelRange ?? {
        from: DEFAULT_LEVEL_RANGE_FROM,
        to: DEFAULT_LEVEL_RANGE_TO,
      };
      const excludedTypes = getExcludedNpcTypes(
        role.permissions,
        visibilityPermissions,
      );
      const conditions = [
        { npc: { path: ["lvl"], gte: levelRange.from } },
        { npc: { path: ["lvl"], lte: levelRange.to } },
        ...excludedTypes.map((npcType) => ({
          npc: { path: ["type"], not: npcType },
        })),
      ];

      return { AND: conditions };
    },
  );

  return { OR: roleConditions };
};

export const buildNpcVisibilitySqlCondition = (
  context: NpcAccessContext,
  visibilityPermissions: NpcVisibilityPermissions,
  tableAlias: string,
  firstParameterIndex: number,
): { sql: string; params: number[] } => {
  if (!/^[a-z][a-z0-9_]*$/.test(tableAlias)) {
    throw new Error("Invalid SQL table alias");
  }

  if (context.isOwner) {
    return { sql: "", params: [] };
  }

  const params: number[] = [];
  const roleConditions = getVisibleRoles(context, visibilityPermissions).map(
    (role) => {
      const levelRange = role.npc?.levelRange ?? {
        from: DEFAULT_LEVEL_RANGE_FROM,
        to: DEFAULT_LEVEL_RANGE_TO,
      };
      const levelFromParameter = firstParameterIndex + params.length;
      params.push(levelRange.from);
      const levelToParameter = firstParameterIndex + params.length;
      params.push(levelRange.to);
      const excludedTypes = getExcludedNpcTypes(
        role.permissions,
        visibilityPermissions,
      );
      const typeCondition = excludedTypes.length
        ? ` AND ${tableAlias}.type NOT IN (${excludedTypes
            .map((npcType) => `'${npcType}'`)
            .join(", ")})`
        : "";

      return `(${tableAlias}.lvl BETWEEN $${levelFromParameter} AND $${levelToParameter}${typeCondition})`;
    },
  );

  if (roleConditions.length === 0) {
    return { sql: "AND FALSE", params };
  }

  return {
    sql: `AND (${roleConditions.join(" OR ")})`,
    params,
  };
};

export const buildNpcJsonVisibilitySqlCondition = (
  context: NpcAccessContext,
  visibilityPermissions: NpcVisibilityPermissions,
  tableAlias: string,
  firstParameterIndex: number,
): { sql: string; params: number[] } => {
  if (!/^[a-z][a-z0-9_]*$/.test(tableAlias)) {
    throw new Error("Invalid SQL table alias");
  }

  if (context.isOwner) {
    return { sql: "", params: [] };
  }

  const params: number[] = [];
  const roleConditions = getVisibleRoles(context, visibilityPermissions).map(
    (role) => {
      const levelRange = role.npc?.levelRange ?? {
        from: DEFAULT_LEVEL_RANGE_FROM,
        to: DEFAULT_LEVEL_RANGE_TO,
      };
      const levelFromParameter = firstParameterIndex + params.length;
      params.push(levelRange.from);
      const levelToParameter = firstParameterIndex + params.length;
      params.push(levelRange.to);
      const excludedTypes = getExcludedNpcTypes(
        role.permissions,
        visibilityPermissions,
      );
      const typeCondition = excludedTypes.length
        ? ` AND ${tableAlias}."npc"->>'type' NOT IN (${excludedTypes
            .map((npcType) => `'${npcType}'`)
            .join(", ")})`
        : "";

      return `((${tableAlias}."npc"->>'lvl')::int BETWEEN $${levelFromParameter} AND $${levelToParameter}${typeCondition})`;
    },
  );

  if (roleConditions.length === 0) {
    return { sql: "AND FALSE", params };
  }

  return {
    sql: `AND (${roleConditions.join(" OR ")})`,
    params,
  };
};
