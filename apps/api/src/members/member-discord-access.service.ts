import type { FieldOutputTypes } from "../prisma/contract.js";
import { and, or } from "@prisma/orm-family-sql/orm-client";
import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "#src/db/prisma.service";
import { attachRolesToMembers } from "./member-roles.repository.js";
import { DiscordSyncDiagnosticsService } from "#src/discord/discord-sync-diagnostics.service";
import { ErrorKey as GuildErrorKey } from "#src/guilds/enum/error-key.enum";
import { serviceConfig } from "#src/config/service.config";
import { RuntimeEnvironment } from "@lootlog/types";
import {
  getMemberCacheSoftTtl,
  getRefreshPermissionsTtl,
} from "./constants/member-cache.constant.js";
import { MEMBER_REFRESH_PRIORITY } from "./constants/member-refresh-queue.constant.js";
import { ErrorKey } from "./enum/error-key.enum.js";
import { isTransientMemberSyncStatus } from "./member-discord-sync-status.js";
import { MemberDiscordRefreshService } from "./member-discord-refresh.service.js";
import type {
  MemberRefreshAttempt,
  MemberWithRoles,
  StoredMemberWithRoles,
} from "./member.types.js";

type Member = FieldOutputTypes["public"]["Member"];

@Injectable()
export class MemberDiscordAccessService {
  private readonly env: RuntimeEnvironment;
  private readonly staleAccessGraceMs = 6 * 60 * 60 * 1000;

  constructor(
    private readonly prisma: PrismaService,
    private readonly memberDiscordRefreshService: MemberDiscordRefreshService,
    private readonly diagnostics: DiscordSyncDiagnosticsService,
  ) {
    this.env = serviceConfig.env;
  }

  async getGuildMemberById(options: {
    discordId: string;
    guildId: string;
    userId: string;
    refresh?: boolean;
    standalone?: boolean;
    skipTtlCheck?: boolean;
    returnDeactivatedMember?: boolean;
    throwOnMemberUnauthorized?: boolean;
  }): Promise<MemberWithRoles | null> {
    const { discordId, guildId, userId } = options;
    const refresh = options.refresh ?? false;
    const standalone = options.standalone ?? false;
    const skipTtlCheck = options.skipTtlCheck ?? false;
    const returnDeactivatedMember = options.returnDeactivatedMember ?? false;
    const throwOnMemberUnauthorized = options.throwOnMemberUnauthorized ?? true;

    const desiredGuildId = await this.resolveDesiredGuildId(
      guildId,
      refresh,
      standalone,
    );

    const now = new Date();
    const cacheTtl = this.getMemberCacheTtl(refresh);
    const cacheExpiry = new Date(now.getTime() - cacheTtl);

    const storedMember = await this.getStoredMember(discordId, desiredGuildId);
    const hasFreshMember = this.hasFreshMember(
      storedMember,
      skipTtlCheck,
      cacheExpiry,
    );

    if (storedMember && refresh && hasFreshMember) {
      throw new BadRequestException(ErrorKey.MEMBER_TTL_ACTIVE);
    }

    if (hasFreshMember) {
      return this.decorateMember(storedMember);
    }

    const refreshAttempt =
      await this.memberDiscordRefreshService.refreshGuildMemberWithinBudget({
        discordId,
        guildId: desiredGuildId,
        userId,
        priority: refresh
          ? MEMBER_REFRESH_PRIORITY.MANUAL
          : MEMBER_REFRESH_PRIORITY.BACKGROUND,
        reason: refresh ? "manual-refresh" : "member-read",
        throwOnUnexpectedError: refresh,
      });

    if (refreshAttempt.status === "UNAUTHORIZED" && throwOnMemberUnauthorized) {
      this.throwMemberSyncError(refreshAttempt);
    }

    const refreshedMember = this.resolveRefreshedMember(
      refreshAttempt,
      returnDeactivatedMember,
    );
    if (refreshedMember !== undefined) {
      return refreshedMember;
    }

    if (refreshAttempt.status === "NOT_FOUND") {
      return null;
    }

    return this.resolveStaleMember(storedMember, refreshAttempt, now);
  }

  private async resolveDesiredGuildId(
    guildId: string,
    refresh: boolean,
    standalone: boolean,
  ): Promise<string> {
    return refresh || standalone ? this.resolveActiveGuildId(guildId) : guildId;
  }

  private getMemberCacheTtl(refresh: boolean): number {
    return refresh
      ? getRefreshPermissionsTtl(this.env)
      : getMemberCacheSoftTtl(this.env);
  }

  private hasFreshMember(
    member: StoredMemberWithRoles | null,
    skipTtlCheck: boolean,
    cacheExpiry: Date,
  ): member is StoredMemberWithRoles {
    return (
      member !== null &&
      !skipTtlCheck &&
      this.isMemberFresh(member, cacheExpiry)
    );
  }

  private resolveRefreshedMember(
    refreshAttempt: MemberRefreshAttempt,
    returnDeactivatedMember: boolean,
  ): MemberWithRoles | null | undefined {
    if (!refreshAttempt.member) return undefined;
    return refreshAttempt.member.active || returnDeactivatedMember
      ? refreshAttempt.member
      : null;
  }

  private async resolveStaleMember(
    storedMember: StoredMemberWithRoles | null,
    refreshAttempt: MemberRefreshAttempt,
    now: Date,
  ): Promise<MemberWithRoles | null> {
    const canUseStaleMember =
      storedMember?.active &&
      (this.canUseStaleMember(storedMember, now) ||
        isTransientMemberSyncStatus(refreshAttempt.status));
    if (!canUseStaleMember) return null;

    await this.diagnostics.recordMemberRefreshMetric({
      outcome: "stale_used",
      reason: refreshAttempt.status,
    });

    return this.decorateMember(storedMember, {
      isStale: true,
      staleWarning: refreshAttempt.refreshQueued
        ? "Using cached data while a Discord refresh is queued"
        : "Using cached data due to Discord API rate limiting or errors",
      refreshQueued: refreshAttempt.refreshQueued,
      nextRefreshAt: refreshAttempt.nextRefreshAt,
    });
  }

  async refreshMember(options: {
    discordId: string;
    guildId: string;
    skipTtlCheck?: boolean;
  }): Promise<MemberWithRoles | null> {
    const member = await this.prisma.db.orm.public.Member.where((row) =>
      and(row.userId.eq(options.discordId), row.guildId.eq(options.guildId)),
    ).first();

    if (!member || !member.globalUserId) {
      throw new NotFoundException(
        "Member not found or global user ID is missing",
      );
    }

    return this.getGuildMemberById({
      discordId: options.discordId,
      guildId: options.guildId,
      userId: member.globalUserId,
      refresh: true,
      standalone: true,
      skipTtlCheck: options.skipTtlCheck,
      returnDeactivatedMember: true,
      throwOnMemberUnauthorized: false,
    });
  }

  isMemberSoftStale(
    member: Pick<Member, "lastDiscordSyncAt" | "updatedAt"> | null | undefined,
  ): boolean {
    if (!member) {
      return true;
    }

    const lastSyncAt = this.getLastDiscordSyncAt(member);
    if (!lastSyncAt) {
      return true;
    }

    return lastSyncAt.getTime() < this.getMemberSoftStaleThreshold().getTime();
  }

  getMemberSoftStaleThreshold(referenceTime: number | Date = Date.now()): Date {
    const baseTime =
      referenceTime instanceof Date ? referenceTime.getTime() : referenceTime;

    return new Date(baseTime - getMemberCacheSoftTtl(this.env));
  }

  private async resolveActiveGuildId(guildId: string): Promise<string> {
    const guild = await this.prisma.db.orm.public.Guild.where((row) =>
      and(
        row.active.eq(true),
        or(row.id.eq(guildId), row.vanityUrl.eq(guildId)),
      ),
    )
      .select("id")
      .first();

    if (!guild) {
      throw new NotFoundException({
        message: GuildErrorKey.GUILD_NOT_FOUND,
      });
    }

    return guild.id;
  }

  private async getStoredMember(
    discordId: string,
    guildId: string,
  ): Promise<StoredMemberWithRoles | null> {
    const member = await this.prisma.db.orm.public.Member.where((row) =>
      and(row.userId.eq(discordId), row.guildId.eq(guildId)),
    ).first();
    return member
      ? ((await attachRolesToMembers(this.prisma.db, [member]))[0] ?? null)
      : null;
  }

  private decorateMember(
    member: StoredMemberWithRoles,
    options: {
      isStale?: boolean;
      staleWarning?: string;
      refreshQueued?: boolean;
      nextRefreshAt?: Date | null;
    } = {},
  ): MemberWithRoles {
    return {
      ...member,
      ...options,
    };
  }

  private getLastDiscordSyncAt(
    member: Pick<Member, "lastDiscordSyncAt">,
  ): Date | null {
    return member.lastDiscordSyncAt ?? null;
  }

  private isMemberFresh(
    member: Pick<Member, "active" | "lastDiscordSyncAt" | "updatedAt">,
    cacheExpiry: Date,
  ): boolean {
    const lastSyncAt = this.getLastDiscordSyncAt(member);
    return Boolean(
      member.active &&
      lastSyncAt !== null &&
      lastSyncAt.getTime() >= cacheExpiry.getTime(),
    );
  }

  private canUseStaleMember(
    member: Pick<Member, "lastDiscordSyncAt">,
    now = new Date(),
  ): boolean {
    const lastSyncAt = member.lastDiscordSyncAt;

    return Boolean(
      lastSyncAt &&
      now.getTime() - lastSyncAt.getTime() <= this.staleAccessGraceMs,
    );
  }

  private throwMemberSyncError(attempt: Pick<MemberRefreshAttempt, "error">) {
    if (attempt.error instanceof Error) {
      throw attempt.error;
    }

    throw new HttpException("Discord member sync failed", HttpStatus.CONFLICT);
  }
}
