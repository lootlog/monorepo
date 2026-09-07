import { NpcTypeEnum } from "@lootlog/schema/npc-type";
import { Permission, PermissionSchema } from "@lootlog/schema/permissions";
import { Schema } from "effect";

const LevelRange = Schema.Struct({ from: Schema.Int, to: Schema.Int });
const AREAS = [
  "timers",
  "chat",
  "notifications",
  "presence",
  "reservations",
  "loots",
  "events",
  "organization",
] as const;
export const AccessPolicyArea = Schema.Literals(AREAS);
export type AccessPolicyArea = typeof AccessPolicyArea.Type;
export const OrganizationAccessPolicy = Schema.Struct({
  organizationId: Schema.NonEmptyString,
  owner: Schema.Boolean,
  permissions: Schema.Array(PermissionSchema),
  grants: Schema.Array(
    Schema.Struct({
      permission: PermissionSchema,
      ranges: Schema.Array(LevelRange),
    }),
  ),
});
export type OrganizationAccessPolicy = typeof OrganizationAccessPolicy.Type;
export const AccessPolicySnapshot = Schema.Struct({
  version: Schema.NonEmptyString,
  organizations: Schema.Array(OrganizationAccessPolicy),
});
export type AccessPolicySnapshot = typeof AccessPolicySnapshot.Type;
export const isAccessPolicySnapshot = Schema.is(AccessPolicySnapshot);
export const AccessPolicyChange = Schema.Struct({
  organizationId: Schema.NonEmptyString,
  areas: Schema.Array(AccessPolicyArea),
  restricted: Schema.Boolean,
  expanded: Schema.Boolean,
});
export type AccessPolicyChange = typeof AccessPolicyChange.Type;

type Range = typeof LevelRange.Type;
type GuildPolicy = {
  readonly guild: { readonly id: string; readonly ownerId: string };
  readonly roles: readonly {
    readonly permissions: readonly Permission[];
    readonly lvlRangeFrom: number;
    readonly lvlRangeTo: number;
  }[];
};
const NPC_PERMISSIONS = {
  timers: [
    Permission.LOOTLOG_TIMERS_READ,
    Permission.LOOTLOG_TIMERS_HEROES_READ,
    Permission.LOOTLOG_TIMERS_TITANS_READ,
  ],
  chat: [
    Permission.LOOTLOG_CHAT_READ,
    Permission.LOOTLOG_CHAT_HEROES_READ,
    Permission.LOOTLOG_CHAT_TITANS_READ,
  ],
  notifications: [
    Permission.LOOTLOG_NOTIFICATIONS_READ,
    Permission.LOOTLOG_NOTIFICATIONS_HEROES_READ,
    Permission.LOOTLOG_NOTIFICATIONS_TITANS_READ,
  ],
  loots: [
    Permission.LOOTLOG_LOOTS_READ,
    Permission.LOOTLOG_LOOTS_HEROES_READ,
    Permission.LOOTLOG_LOOTS_TITANS_READ,
  ],
} as const;
const RANGE_PERMISSIONS = Object.values(NPC_PERMISSIONS).flat();
const LOOT_RANGE_PERMISSIONS = new Set<Permission>(NPC_PERMISSIONS.loots);
const ALL_PERMISSIONS = Object.values(Permission).sort();
const NPC_TYPES = new Set<string>(Object.values(NpcTypeEnum));

const mergeRanges = (ranges: Range[]): Range[] => {
  const merged: Array<{ from: number; to: number }> = [];
  for (const range of ranges.sort((a, b) => a.from - b.from || a.to - b.to)) {
    if (range.from > range.to) continue;
    const last = merged[merged.length - 1];
    if (last && range.from <= last.to) last.to = Math.max(last.to, range.to);
    else merged.push({ ...range });
  }
  return merged;
};

/** Canonical effective grants: role identifiers, role ordering, and overlapping grants do not change the version. */
export const createAccessPolicySnapshot = (
  guilds: readonly GuildPolicy[],
  discordId: string,
): AccessPolicySnapshot => {
  const organizations = guilds
    .map(({ guild, roles }): OrganizationAccessPolicy => {
      const owner = guild.ownerId === discordId;
      const explicit = new Set(roles.flatMap((role) => role.permissions));
      const administrator = owner || explicit.has(Permission.ADMIN);
      const permissions = administrator
        ? ALL_PERMISSIONS.filter(
            (permission) => owner || permission !== Permission.OWNER,
          )
        : [...explicit].sort();
      const grants = RANGE_PERMISSIONS.map((permission) => {
        const bypass =
          owner || (administrator && !LOOT_RANGE_PERMISSIONS.has(permission));
        const ranges = bypass
          ? [{ from: 0, to: Number.MAX_SAFE_INTEGER }]
          : mergeRanges(
              roles
                .filter(
                  (role) =>
                    role.permissions.includes(permission) &&
                    (!LOOT_RANGE_PERMISSIONS.has(permission) ||
                      role.permissions.includes(Permission.LOOTLOG_LOOTS_READ)),
                )
                .map((role) => ({
                  from: role.lvlRangeFrom,
                  to: role.lvlRangeTo,
                })),
            );
        return { permission, ranges };
      })
        .filter(({ ranges }) => ranges.length > 0)
        .sort((a, b) => a.permission.localeCompare(b.permission));
      return { organizationId: guild.id, owner, permissions, grants };
    })
    .sort((a, b) => a.organizationId.localeCompare(b.organizationId));
  return { version: JSON.stringify(organizations), organizations };
};

const permissionArea = (permission: Permission): AccessPolicyArea => {
  if (permission.startsWith("LOOTLOG_TIMERS_")) return "timers";
  if (permission.startsWith("LOOTLOG_CHAT_")) return "chat";
  if (permission.startsWith("LOOTLOG_NOTIFICATIONS_")) return "notifications";
  if (permission.startsWith("LOOTLOG_LOOTS_")) return "loots";
  if (permission.startsWith("LOOTLOG_RESERVATIONS_")) return "reservations";
  if (permission.startsWith("LOOTLOG_EVENTS_")) return "events";
  if (
    permission === Permission.LOOTLOG_ONLINE_PLAYERS_READ ||
    permission === Permission.LOOTLOG_PRESENCE_LOCATION_READ
  )
    return "presence";
  return "organization";
};

const includesArea = (
  target: OrganizationAccessPolicy,
  source: OrganizationAccessPolicy,
  area: AccessPolicyArea,
): boolean =>
  source.permissions
    .filter((permission) => permissionArea(permission) === area)
    .every((permission) => target.permissions.includes(permission)) &&
  source.grants
    .filter(({ permission }) => permissionArea(permission) === area)
    .every(({ permission, ranges }) => {
      const targetRanges =
        target.grants.find((grant) => grant.permission === permission)
          ?.ranges ?? [];
      return ranges.every((range) =>
        targetRanges.some(
          (candidate) =>
            candidate.from <= range.from && candidate.to >= range.to,
        ),
      );
    });

/** Compare the local snapshot, including after reconnect; the event's delta may refer to a newer server baseline. */
export const diffAccessPolicies = (
  previous: AccessPolicySnapshot,
  next: AccessPolicySnapshot,
): AccessPolicyChange[] => {
  if (previous.version === next.version) return [];
  const before = new Map(
    previous.organizations.map((organization) => [
      organization.organizationId,
      organization,
    ]),
  );
  const after = new Map(
    next.organizations.map((organization) => [
      organization.organizationId,
      organization,
    ]),
  );
  const changes: AccessPolicyChange[] = [];
  for (const organizationId of new Set([...before.keys(), ...after.keys()])) {
    const oldPolicy = before.get(organizationId);
    const newPolicy = after.get(organizationId);
    if (!oldPolicy || !newPolicy) {
      changes.push({
        organizationId,
        areas: [...AREAS],
        restricted: !newPolicy,
        expanded: !oldPolicy,
      });
      continue;
    }
    for (const area of AREAS) {
      const restricted = !includesArea(newPolicy, oldPolicy, area);
      const expanded = !includesArea(oldPolicy, newPolicy, area);
      if (restricted || expanded)
        changes.push({ organizationId, areas: [area], restricted, expanded });
    }
  }
  return changes;
};

export const canReadPolicyNpc = (
  organization: OrganizationAccessPolicy,
  area: "timers" | "chat" | "notifications",
  npc: { readonly type: string; readonly lvl: number } | null,
): boolean => {
  if (area === "timers" && npc === null) return false;
  if (
    npc &&
    (!Number.isFinite(npc.lvl) || npc.lvl < 0 || !NPC_TYPES.has(npc.type))
  )
    return false;
  if (organization.owner || organization.permissions.includes(Permission.ADMIN))
    return true;
  const [base, heroes, titans] = NPC_PERMISSIONS[area];
  if (!organization.permissions.includes(base)) return false;
  if (npc === null) return true;
  let permission: Permission = base;
  if (npc.type === "TITAN") permission = titans;
  if (npc.type === "HERO" || npc.type === "EVENT_HERO") permission = heroes;
  return (
    organization.grants
      .find((grant) => grant.permission === permission)
      ?.ranges.some(({ from, to }) => from <= npc.lvl && to >= npc.lvl) ?? false
  );
};
