import type { memberTable, roleTable } from "../database/drizzle/schema.js";
import type {
  MemberRefreshStatus,
  MemberSyncStatus,
} from "./member-discord-sync-status.js";
import type { MemberLastDiscordStatus } from "./member-discord-status.js";

export type Member = typeof memberTable.$inferSelect;

export type Role = typeof roleTable.$inferSelect;

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

export type MemberBulkRefreshJobData = {
  jobId: number;
  guildId: string;
  memberIds: string[];
};

export type DeactivateMembersMissingFromDiscordGuildsOptions = {
  discordId: string;
  userId: string;
  activeDiscordGuildIds: string[];
  status: MemberLastDiscordStatus;
};
