import type { FieldOutputTypes } from "../prisma/contract.js";
import type { db as prismaDbType } from "#src/prisma/db";
import type {
  MemberRefreshStatus,
  MemberSyncStatus,
} from "./member-discord-sync-status.js";
import type { MemberLastDiscordStatus } from "./constants/member-discord-status.constant.js";
import type { MemberRole } from "./member-roles.repository.js";

type Member = FieldOutputTypes["public"]["Member"];
type MemberRefreshJob = FieldOutputTypes["public"]["MemberRefreshJob"];
type DatabaseTransaction = Parameters<
  Parameters<(typeof prismaDbType)["transaction"]>[0]
>[0];
export type MemberWithRoles = Member & {
  roles: MemberRole[];
  isStale?: boolean;
  staleWarning?: string;
  refreshQueued?: boolean;
  nextRefreshAt?: Date | null;
};

export type StoredMemberWithRoles = Member & {
  roles: MemberRole[];
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

export type DeleteMembersByGuildIdOptions = {
  tx?: DatabaseTransaction;
};

export type DeactivateMembersMissingFromDiscordGuildsOptions = {
  discordId: string;
  userId: string;
  activeDiscordGuildIds: string[];
  status: MemberLastDiscordStatus;
};
