import type { Member, Prisma, Role } from "src/generated/prisma/client";
import type {
  MemberRefreshStatus,
  MemberSyncStatus,
} from "./member-discord-sync-status";

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

export type DeleteMembersByGuildIdResult = {
  count: number;
  affectedMembers: MemberRemovalNotificationTarget[];
};

export type DeleteMembersByGuildIdOptions = {
  tx?: Prisma.TransactionClient;
};
