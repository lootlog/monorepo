export const LOOT_PERMISSION = {
  owner: "OWNER",
  read: "LOOTLOG_LOOTS_READ",
  readHeroes: "LOOTLOG_LOOTS_HEROES_READ",
  readTitans: "LOOTLOG_LOOTS_TITANS_READ",
} as const;

export type LootVisibilityNpc = {
  level: number | null;
  type: string | null;
};

export type LootVisibilityRole = {
  id: string;
  levelFrom: number;
  levelTo: number;
  permissions: readonly string[];
};

export type LootVisibilityPolicy = {
  permissions: readonly string[];
  roles: readonly LootVisibilityRole[];
};

export type LootVisibilityDecisionInput = LootVisibilityPolicy & {
  npcs: readonly LootVisibilityNpc[];
};

export type LootAccessFingerprintInput = LootVisibilityPolicy & {
  organizationId: string;
};

export function canViewLoot(input: LootVisibilityDecisionInput): boolean {
  if (input.permissions.includes(LOOT_PERMISSION.owner)) {
    return true;
  }

  if (input.npcs.length === 0) {
    return false;
  }

  return input.npcs.every((npc) =>
    input.roles.some((role) => roleCoversNpc(role, npc)),
  );
}

export function createLootAccessFingerprint(
  input: LootAccessFingerprintInput,
): string {
  const permissions = [...new Set(input.permissions)].sort();
  const roles = input.roles
    .map((role) => ({
      id: role.id,
      levelFrom: role.levelFrom,
      levelTo: role.levelTo,
      permissions: [...new Set(role.permissions)].sort(),
    }))
    .sort((left, right) => left.id.localeCompare(right.id));

  return JSON.stringify({
    organizationId: input.organizationId,
    permissions,
    roles,
  });
}

function roleCoversNpc(
  role: LootVisibilityRole,
  npc: LootVisibilityNpc,
): boolean {
  if (npc.level === null || npc.type === null) {
    return false;
  }

  if (!role.permissions.includes(LOOT_PERMISSION.read)) {
    return false;
  }

  if (npc.level < role.levelFrom || npc.level > role.levelTo) {
    return false;
  }

  if (
    npc.type === "TITAN" &&
    !role.permissions.includes(LOOT_PERMISSION.readTitans)
  ) {
    return false;
  }

  if (
    (npc.type === "HERO" || npc.type === "EVENT_HERO") &&
    !role.permissions.includes(LOOT_PERMISSION.readHeroes)
  ) {
    return false;
  }

  return true;
}
