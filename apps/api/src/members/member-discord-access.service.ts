import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "src/db/prisma.service";
import { DiscordSyncDiagnosticsService } from "src/discord/discord-sync-diagnostics.service";
import { ErrorKey as GuildErrorKey } from "src/guilds/enum/error-key.enum";
import type { Member } from "src/generated/prisma/client";
import { serviceConfig } from "src/config/service.config";
import { RuntimeEnvironment } from "src/types/runtime.types";
import {
  getMemberCacheSoftTtl,
  getRefreshPermissionsTtl,
} from "./constants/member-cache.constant";
import { MEMBER_REFRESH_PRIORITY } from "./constants/member-refresh-queue.constant";
import { ErrorKey } from "./enum/error-key.enum";
import { isTransientMemberSyncStatus } from "./member-discord-sync-status";
import { MemberDiscordRefreshService } from "./member-discord-refresh.service";
import type {
  MemberRefreshAttempt,
  MemberWithRoles,
  StoredMemberWithRoles,
} from "./member.types";

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
    const {
      discordId,
      guildId,
      userId,
      refresh = false,
      standalone = false,
      skipTtlCheck = false,
      returnDeactivatedMember = false,
      throwOnMemberUnauthorized = true,
    } = options;

    const desiredGuildId =
      refresh || standalone
        ? await this.resolveActiveGuildId(guildId)
        : guildId;

    const now = new Date();
    const cacheTtl = refresh
      ? getRefreshPermissionsTtl(this.env)
      : getMemberCacheSoftTtl(this.env);
    const cacheExpiry = new Date(now.getTime() - cacheTtl);

    const storedMember = await this.getStoredMember(discordId, desiredGuildId);
    const hasFreshMember =
      storedMember !== null &&
      !skipTtlCheck &&
      this.isMemberFresh(storedMember, cacheExpiry);

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

    if (refreshAttempt.member) {
      return refreshAttempt.member.active || returnDeactivatedMember
        ? refreshAttempt.member
        : null;
    }

    if (refreshAttempt.status === "NOT_FOUND") {
      return null;
    }

    if (
      storedMember?.active &&
      (this.canUseStaleMember(storedMember, now) ||
        isTransientMemberSyncStatus(refreshAttempt.status))
    ) {
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

    return null;
  }

  async refreshMember(options: {
    discordId: string;
    guildId: string;
    skipTtlCheck?: boolean;
  }): Promise<MemberWithRoles | null> {
    const member = await this.prisma.member.findUnique({
      where: {
        memberId: { userId: options.discordId, guildId: options.guildId },
      },
    });

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
    const guild = await this.prisma.guild.findFirst({
      where: {
        active: true,
        OR: [{ id: guildId }, { vanityUrl: guildId }],
      },
      select: {
        id: true,
      },
    });

    if (!guild) {
      throw new NotFoundException({
        message: GuildErrorKey.GUILD_NOT_FOUND,
      });
    }

    return guild.id;
  }

  private getStoredMember(
    discordId: string,
    guildId: string,
  ): Promise<StoredMemberWithRoles | null> {
    return this.prisma.member.findUnique({
      where: {
        memberId: { userId: discordId, guildId },
      },
      include: { roles: true },
    });
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
