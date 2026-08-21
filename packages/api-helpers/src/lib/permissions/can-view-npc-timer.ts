export type NpcPermissionData = {
  lvl: number;
  type: string;
};

export type RolePermissionData = {
  permissions: readonly string[];
  lvlRangeFrom: number;
  lvlRangeTo: number;
};

export type NpcSelector = {
  includeIds?: readonly number[];
  excludeIds?: readonly number[];
  includeTypes?: readonly string[];
  excludeTypes?: readonly string[];
  includeGroups?: readonly string[];
  excludeGroups?: readonly string[];
  levelRange?: {
    from: number;
    to: number;
  };
};

export type NpcAccessRole = {
  permissions: readonly string[];
  worlds?: readonly string[];
  npc?: NpcSelector;
};

export type NpcAccessContext = {
  organizationId: string;
  isOwner: boolean;
  roles: readonly NpcAccessRole[];
};

export type NpcResource = {
  organizationId: string;
  world: string;
  npc: {
    id: number;
    type: string;
    group: string | null;
    level: number;
  };
};

export type NpcVisibilityPermissions = {
  base: string;
  heroes: string;
  titans: string;
};

export type NpcAccessDecision = {
  visible: boolean;
  allowed: boolean;
};

type EvaluateNpcAccessOptions = {
  context: NpcAccessContext;
  resource: NpcResource;
  visibilityPermissions: NpcVisibilityPermissions;
  actionPermission?: string;
};

const HERO_NPC_TYPES = new Set(["HERO", "EVENT_HERO"]);

const matchesIncludedValue = <T>(
  includedValues: readonly T[] | undefined,
  value: T,
): boolean => !includedValues?.length || includedValues.includes(value);

const matchesExcludedValue = <T>(
  excludedValues: readonly T[] | undefined,
  value: T,
): boolean => !excludedValues?.includes(value);

const matchesNpcSelector = (
  selector: NpcSelector | undefined,
  resource: NpcResource,
): boolean => {
  if (!selector) return true;

  const { npc } = resource;
  if (!matchesIncludedValue(selector.includeIds, npc.id)) return false;
  if (!matchesExcludedValue(selector.excludeIds, npc.id)) return false;
  if (!matchesIncludedValue(selector.includeTypes, npc.type)) return false;
  if (!matchesExcludedValue(selector.excludeTypes, npc.type)) return false;

  if (selector.includeGroups?.length) {
    if (npc.group === null || !selector.includeGroups.includes(npc.group)) {
      return false;
    }
  }

  if (npc.group !== null && selector.excludeGroups?.includes(npc.group)) {
    return false;
  }

  if (
    selector.levelRange &&
    (npc.level < selector.levelRange.from || npc.level > selector.levelRange.to)
  ) {
    return false;
  }

  return true;
};

const getRequiredVisibilityPermissions = (
  npcType: string,
  visibilityPermissions: NpcVisibilityPermissions,
): readonly string[] => {
  if (npcType === "TITAN") {
    return [visibilityPermissions.base, visibilityPermissions.titans];
  }

  if (HERO_NPC_TYPES.has(npcType)) {
    return [visibilityPermissions.base, visibilityPermissions.heroes];
  }

  return [visibilityPermissions.base];
};

const roleMatchesResource = (
  role: NpcAccessRole,
  resource: NpcResource,
): boolean => {
  if (role.worlds?.length && !role.worlds.includes(resource.world)) {
    return false;
  }

  return matchesNpcSelector(role.npc, resource);
};

export const evaluateNpcAccess = ({
  context,
  resource,
  visibilityPermissions,
  actionPermission,
}: EvaluateNpcAccessOptions): NpcAccessDecision => {
  if (context.organizationId !== resource.organizationId) {
    return { visible: false, allowed: false };
  }

  if (context.isOwner) {
    return { visible: true, allowed: true };
  }

  const requiredVisibilityPermissions = getRequiredVisibilityPermissions(
    resource.npc.type,
    visibilityPermissions,
  );
  const matchingRoles = context.roles.filter(
    (role) =>
      roleMatchesResource(role, resource) &&
      requiredVisibilityPermissions.every((permission) =>
        role.permissions.includes(permission),
      ),
  );
  const visible = matchingRoles.length > 0;

  if (!visible || !actionPermission) {
    return { visible, allowed: visible };
  }

  return {
    visible,
    allowed: matchingRoles.some((role) =>
      role.permissions.includes(actionPermission),
    ),
  };
};

const PERMISSION = {
  LOOTLOG_TIMERS_READ: "LOOTLOG_TIMERS_READ",
  LOOTLOG_TIMERS_TITANS_READ: "LOOTLOG_TIMERS_TITANS_READ",
  LOOTLOG_TIMERS_HEROES_READ: "LOOTLOG_TIMERS_HEROES_READ",
} as const;

type TimerPermission = (typeof PERMISSION)[keyof typeof PERMISSION];
type TimerPermissionTier = "base" | "titans" | "heroes";

const TIMER_PERMISSION_BY_TIER: Record<TimerPermissionTier, TimerPermission> = {
  base: PERMISSION.LOOTLOG_TIMERS_READ,
  titans: PERMISSION.LOOTLOG_TIMERS_TITANS_READ,
  heroes: PERMISSION.LOOTLOG_TIMERS_HEROES_READ,
};

const TIMER_PERMISSION_TIER_BY_NPC_TYPE: Partial<
  Record<string, TimerPermissionTier>
> = {
  TITAN: "titans",
  HERO: "heroes",
  EVENT_HERO: "heroes",
};

const isNpcLevelWithinRoleRange = (
  role: RolePermissionData,
  npcLevel: number,
): boolean => role.lvlRangeFrom <= npcLevel && role.lvlRangeTo >= npcLevel;

export const hasRolePermissionInLevelRange = (
  roles: readonly RolePermissionData[],
  permission: string,
  npcLevel: number,
): boolean =>
  roles.some(
    (role) =>
      role.permissions.includes(permission) &&
      isNpcLevelWithinRoleRange(role, npcLevel),
  );

const getRequiredTimerPermission = (npcType: string): TimerPermission =>
  TIMER_PERMISSION_BY_TIER[
    TIMER_PERMISSION_TIER_BY_NPC_TYPE[npcType] ?? "base"
  ];

export const canViewNpcTimer = (
  npc: NpcPermissionData | null,
  roles: readonly RolePermissionData[],
): boolean => {
  if (!npc) return false;

  const requiredTimerPermission = getRequiredTimerPermission(npc.type);

  return hasRolePermissionInLevelRange(roles, requiredTimerPermission, npc.lvl);
};
