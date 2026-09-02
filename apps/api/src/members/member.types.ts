import type {
  memberRefreshJobTable,
  memberTable,
  roleTable,
} from "../database/drizzle/schema.js";
import type {
  MemberRefreshStatus,
  MemberSyncStatus,
} from "./member-discord-sync-status.js";
import type { MemberLastDiscordStatus } from "./constants/member-discord-status.constant.js";

export type Member = typeof memberTable.$inferSelect;
export type Role = typeof roleTable.$inferSelect;
export type MemberRefreshJob = typeof memberRefreshJobTable.$inferSelect;

export type MemberWithRoles = Member & {
  roles: Role[];
  isStale?: boolean;
  staleWarning?: string;
  refreshQueued?: boolean;
  nextRefreshAt?: Date | null;
};

export type StoredMemberWithRoles = Member & {
  roles: Role[];
};

export type MemberSyncResult = {
  member: MemberWithRoles | null;
  status: MemberSyncStatus;
  error?: unknown;
  nextRefreshAt: Date | null;
};

export type MemberRefreshAttempt = {
  member: MemberWithRoles | null;
  status: MemberRefreshStatus;
  error?: unknown;
  refreshQueued: boolean;
  nextRefreshAt: Date | null;
};

export type MemberRemovalNotificationTarget = {
  discordId: string;
  guildId: string;
  globalUserId: string | null;
};

export type MemberReference = {
  id: number;
  userId: string;
  name: string;
  avatar: string | null;
  color: number | null;
  active: boolean;
};

export type MemberSummary = Omit<MemberReference, "active">;

export type MemberLootlogConfigCharacterSummary = {
  accountId: string;
  characterId: string;
  enabledForGuild: boolean;
  characterName: string | null;
  world: string | null;
  icon: string | null;
  metadataStatus: "resolved" | "missing_snapshot" | "invalid_character_ref";
};

export type MemberLootlogConfigSummary = {
  memberUserId: string;
  guildId: string;
  isActive: boolean;
  configuredCharacterCount: number;
  enabledCharacterCount: number;
  characters: MemberLootlogConfigCharacterSummary[];
};

export type RefreshJobWithCooldown = MemberRefreshJob & {
  nextAvailableAt: Date;
};

export type MemberBulkRefreshJobData = {
  jobId: number;
  guildId: string;
  memberIds: string[];
};

export type DeleteMembersByGuildIdResult = {
  count: number;
  affectedMembers: MemberRemovalNotificationTarget[];
};

export type DeactivateMembersMissingFromDiscordGuildsOptions = {
  discordId: string;
  userId: string;
  activeDiscordGuildIds: string[];
  status: MemberLastDiscordStatus;
};
