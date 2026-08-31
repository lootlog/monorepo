import type { FieldOutputTypes } from "../prisma/contract.js";
import { Injectable } from "@nestjs/common";
import type { APIGuildMember } from "discord-api-types/v10";
import { MemberBulkRefreshService } from "./member-bulk-refresh.service.js";
import { MemberDiscordAccessService } from "./member-discord-access.service.js";
import { MemberDiscordRefreshService } from "./member-discord-refresh.service.js";
import { MemberDiscordSyncService } from "./member-discord-sync.service.js";
import type { MemberRefreshScheduleResult } from "./member-refresh-scheduler.service.js";
import { MemberReadService } from "./member-read.service.js";
import { MemberRemovalService } from "./member-removal.service.js";
import type {
  DeactivateMembersMissingFromDiscordGuildsOptions,
  DeleteMembersByGuildIdOptions,
  DeleteMembersByGuildIdResult,
  MemberLootlogConfigSummary,
  MemberReference,
  MemberRefreshAttempt,
  MemberRemovalNotificationTarget,
  MemberSummary,
  MemberSyncResult,
  MemberWithRoles,
  RefreshJobWithCooldown,
} from "./member.types.js";

type Member = FieldOutputTypes["public"]["Member"];

@Injectable()
export class MembersService {
  constructor(
    private readonly memberBulkRefreshService: MemberBulkRefreshService,
    private readonly memberDiscordAccessService: MemberDiscordAccessService,
    private readonly memberDiscordRefreshService: MemberDiscordRefreshService,
    private readonly memberDiscordSyncService: MemberDiscordSyncService,
    private readonly memberReadService: MemberReadService,
    private readonly memberRemovalService: MemberRemovalService,
  ) {}

  getGuildMemberById(options: {
    discordId: string;
    guildId: string;
    userId: string;
    refresh?: boolean;
    standalone?: boolean;
    skipTtlCheck?: boolean;
    returnDeactivatedMember?: boolean;
    throwOnMemberUnauthorized?: boolean;
  }): Promise<MemberWithRoles | null> {
    return this.memberDiscordAccessService.getGuildMemberById(options);
  }

  refreshGuildMemberWithinBudget(options: {
    discordId: string;
    guildId: string;
    userId: string;
    priority: number;
    reason: string;
    throwOnUnexpectedError?: boolean;
  }): Promise<MemberRefreshAttempt> {
    return this.memberDiscordRefreshService.refreshGuildMemberWithinBudget(
      options,
    );
  }

  queueMemberRefresh(options: {
    discordId: string;
    guildId: string;
    userId: string;
    priority: number;
    reason: string;
  }): Promise<MemberRefreshScheduleResult> {
    return this.memberDiscordRefreshService.queueMemberRefresh(options);
  }

  syncMemberFromDiscord(options: {
    discordId: string;
    guildId: string;
    userId: string;
    throwOnUnexpectedError?: boolean;
  }): Promise<MemberSyncResult> {
    return this.memberDiscordSyncService.syncMemberFromDiscord(options);
  }

  refreshMember(options: {
    discordId: string;
    guildId: string;
    skipTtlCheck?: boolean;
  }): Promise<MemberWithRoles | null> {
    return this.memberDiscordAccessService.refreshMember(options);
  }

  isMemberSoftStale(
    member: Pick<Member, "lastDiscordSyncAt" | "updatedAt"> | null | undefined,
  ): boolean {
    return this.memberDiscordAccessService.isMemberSoftStale(member);
  }

  getMemberSoftStaleThreshold(referenceTime?: number | Date): Date {
    return this.memberDiscordAccessService.getMemberSoftStaleThreshold(
      referenceTime,
    );
  }

  createOrUpdateMember(
    member: APIGuildMember & {
      guildId: string;
      globalUserId: string;
    },
  ): Promise<MemberWithRoles> {
    return this.memberDiscordSyncService.createOrUpdateMember(member);
  }

  deactivateMember(options: {
    discordId: string;
    guildId: string;
  }): Promise<MemberWithRoles> {
    return this.memberRemovalService.deactivateMember(options);
  }

  deactivateMembersMissingFromDiscordGuilds(
    options: DeactivateMembersMissingFromDiscordGuildsOptions,
  ): Promise<number> {
    return this.memberRemovalService.deactivateMembersMissingFromDiscordGuilds(
      options,
    );
  }

  deleteMembersByGuildId(
    guildId: string,
    options?: DeleteMembersByGuildIdOptions,
  ): Promise<DeleteMembersByGuildIdResult> {
    return this.memberRemovalService.deleteMembersByGuildId(guildId, options);
  }

  notifyMembersRemoved(
    members: MemberRemovalNotificationTarget[],
    batchSize?: number,
  ): Promise<void> {
    return this.memberRemovalService.notifyMembersRemoved(members, batchSize);
  }

  getGuildMembers(
    guildId: string,
    includeInactive = false,
  ): Promise<MemberWithRoles[]> {
    return this.memberReadService.getGuildMembers(guildId, includeInactive);
  }

  getGuildMemberReferences(
    guildId: string,
    includeInactive = false,
  ): Promise<MemberReference[]> {
    return this.memberReadService.getGuildMemberReferences(
      guildId,
      includeInactive,
    );
  }

  getGuildMembersSummary(guildId: string): Promise<MemberSummary[]> {
    return this.memberReadService.getGuildMembersSummary(guildId);
  }

  getMemberLootlogConfigSummary(options: {
    discordId: string;
    guildId: string;
  }): Promise<MemberLootlogConfigSummary> {
    return this.memberReadService.getMemberLootlogConfigSummary(options);
  }

  createBulkRefreshJob(
    guildId: string,
    requestedBy: string,
  ): Promise<RefreshJobWithCooldown> {
    return this.memberBulkRefreshService.createBulkRefreshJob(
      guildId,
      requestedBy,
    );
  }

  getLatestRefreshJob(guildId: string): Promise<RefreshJobWithCooldown | null> {
    return this.memberBulkRefreshService.getLatestRefreshJob(guildId);
  }

  getRefreshJobStatus(options: {
    guildId: string;
    jobId: number;
  }): Promise<RefreshJobWithCooldown> {
    return this.memberBulkRefreshService.getRefreshJobStatus(options);
  }
}
