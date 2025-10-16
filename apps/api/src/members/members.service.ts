import {
  BadRequestException,
  forwardRef,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { PrismaService } from 'src/db/prisma.service';
import {
  getMemberCacheTtl,
  getRefreshPermissionsTtl,
  getAdminBulkRefreshRateLimit,
} from 'src/members/constants/member-cache.constant';
import { DiscordService } from 'src/discord/discord.service';
import { APIGuildMember } from 'discord-api-types/v10';
import { ErrorKey } from 'src/members/enum/error-key.enum';
import { GuildsService } from 'src/guilds/guilds.service';
import { Member, Role } from 'generated/client';
import { DEFAULT_EXCHANGE_NAME } from 'src/config/rabbitmq.config';
import { RoutingKey } from 'src/enum/routing-key.enum';
import { ConfigKey } from 'src/config/config-key.enum';
import { ServiceConfig } from 'src/config/service.config';
import { RuntimeEnvironment } from 'src/types/runtime.types';

type MemberWithRoles = Member & {
  roles: Role[];
  isStale?: boolean;
  staleWarning?: string;
};

@Injectable()
export class MembersService {
  private readonly env: RuntimeEnvironment;

  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    private readonly prisma: PrismaService,
    private readonly discordService: DiscordService,
    @Inject(forwardRef(() => GuildsService))
    private readonly guildsService: GuildsService,
    private readonly amqpConnection: AmqpConnection,
    private readonly configService: ConfigService,
  ) {
    const serviceConfig = this.configService.get<ServiceConfig>(
      ConfigKey.SERVICE,
    );
    this.env = serviceConfig?.env || RuntimeEnvironment.LOCAL;
  }

  private async getStaleMember(
    discordId: string,
    guildId: string,
    warningMessage: string,
  ): Promise<MemberWithRoles | null> {
    const staleMember = await this.prisma.member.findUnique({
      where: {
        memberId: { userId: discordId, guildId },
      },
      include: { roles: true },
    });

    if (staleMember) {
      return {
        ...staleMember,
        isStale: true,
        staleWarning: warningMessage,
      };
    }

    return null;
  }

  /**
   * Caching strategy: standard TTL (5min) vs refresh TTL (30s)
   * Fallback: serves stale data on API failures with warning flag
   * Auto-deactivates members on NotFoundException or 401 Unauthorized
   */
  async getGuildMemberById(options: {
    discordId: string;
    guildId: string;
    userId: string;
    refresh?: boolean;
    standalone?: boolean;
    skipTtlCheck?: boolean;
  }): Promise<MemberWithRoles | null> {
    const {
      discordId,
      guildId,
      userId,
      refresh = false,
      standalone = false,
      skipTtlCheck = false,
    } = options;

    let desiredGuildId = guildId;
    if (refresh || standalone) {
      const guild = await this.guildsService.getGuildById(guildId);
      desiredGuildId = guild.id;
    }

    const now = new Date();
    const cacheTtl = refresh
      ? getRefreshPermissionsTtl(this.env)
      : getMemberCacheTtl(this.env);
    const cacheExpiry = new Date(now.getTime() - cacheTtl);

    const member = await this.prisma.member.findUnique({
      where: {
        memberId: { userId: discordId, guildId: desiredGuildId },
        updatedAt: { gte: cacheExpiry },
        active: true,
      },
      include: { roles: true },
    });

    if (member && refresh && !skipTtlCheck) {
      throw new BadRequestException(ErrorKey.MEMBER_TTL_ACTIVE);
    }

    if (!member || skipTtlCheck) {
      try {
        const discordMember = await this.discordService.getGuildMember({
          guildId: desiredGuildId,
          userId,
        });

        if (!discordMember) {
          this.logger.log({
            level: 'warn',
            message: 'Discord API returned null, attempting to serve stale data',
            guildId: desiredGuildId,
            userId: discordId,
          });

          const staleMember = await this.getStaleMember(
            discordId,
            desiredGuildId,
            'Using cached data due to Discord API rate limiting or errors',
          );

          if (staleMember && staleMember.active) {
            return staleMember;
          }

          return null;
        }

        return this.createOrUpdateMember({
          ...discordMember,
          guildId: desiredGuildId,
          globalUserId: userId,
        });
      } catch (error) {
        if (error instanceof NotFoundException) {
          const existingMember = await this.prisma.member.findUnique({
            where: {
              memberId: { userId: discordId, guildId: desiredGuildId },
            },
          });

          if (existingMember && existingMember.active) {
            await this.prisma.member.update({
              where: {
                memberId: { userId: discordId, guildId: desiredGuildId },
              },
              data: { active: false, roles: { set: [] } },
            });
          }

          return null;
        }

        if (
          error instanceof HttpException &&
          error.getStatus() === HttpStatus.UNAUTHORIZED
        ) {
          this.logger.log({
            level: 'warn',
            message: 'User authentication failed (token expired/invalid), deactivating member',
            guildId: desiredGuildId,
            userId: discordId,
          });

          const existingMember = await this.prisma.member.findUnique({
            where: {
              memberId: { userId: discordId, guildId: desiredGuildId },
            },
          });

          if (existingMember && existingMember.active) {
            await this.prisma.member.update({
              where: {
                memberId: { userId: discordId, guildId: desiredGuildId },
              },
              data: { active: false, roles: { set: [] } },
            });
          }

          return null;
        }

        if (error instanceof ServiceUnavailableException) {
          this.logger.log({
            level: 'warn',
            message: 'Auth service unavailable, serving stale data',
            guildId: desiredGuildId,
            userId,
          });

          return this.getStaleMember(
            discordId,
            desiredGuildId,
            'Data may be outdated due to service issues',
          );
        }

        this.logger.log({
          level: 'error',
          message: 'Failed to fetch member from Discord, serving stale data',
          stack: (error as Error).stack,
        });

        if (refresh) {
          throw error;
        }

        return this.getStaleMember(
          discordId,
          desiredGuildId,
          'Using cached data due to API error',
        );
      }
    }

    return member;
  }

  async refreshMember(options: {
    discordId: string;
    guildId: string;
    skipTtlCheck?: boolean;
  }) {
    const member = await this.prisma.member.findUnique({
      where: {
        memberId: { userId: options.discordId, guildId: options.guildId },
      },
    });

    if (!member || !member.globalUserId) {
      throw new NotFoundException(
        'Member not found or global user ID is missing',
      );
    }

    return this.getGuildMemberById({
      discordId: options.discordId,
      guildId: options.guildId,
      userId: member.globalUserId,
      refresh: true,
      standalone: true,
      skipTtlCheck: options.skipTtlCheck,
    });
  }

  async getGuildMembers(guildId: string): Promise<MemberWithRoles[]> {
    return this.prisma.member.findMany({
      where: { guildId, active: true, globalUserId: { not: null } },
      include: {
        roles: {
          orderBy: { position: 'desc' },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async createOrUpdateMember({
    guildId,
    avatar,
    nick,
    banner,
    roles: roleIds,
    user,
    globalUserId,
  }: APIGuildMember & {
    guildId: string;
    globalUserId: string;
  }): Promise<MemberWithRoles> {
    const { id } = user;

    try {
      const existingRoleIds =
        roleIds.length > 0
          ? (
              await this.prisma.role.findMany({
                where: { id: { in: roleIds } },
                select: { id: true },
              })
            ).map((role) => role.id)
          : [];

      const memberName = nick || user.global_name || user.username;
      const memberAvatar = avatar || user.avatar;

      const member = await this.prisma.member.upsert({
        where: { memberId: { userId: id, guildId } },
        update: {
          avatar: memberAvatar,
          banner,
          name: memberName,
          active: true,
          globalUserId,
          roles: { set: existingRoleIds.map((roleId) => ({ id: roleId })) },
        },
        create: {
          userId: id,
          guild: { connect: { id: guildId } },
          avatar: memberAvatar,
          active: true,
          name: memberName,
          globalUserId,
          banner,
          roles: { connect: existingRoleIds.map((roleId) => ({ id: roleId })) },
        },
        include: { roles: true },
      });

      return member;
    } catch (error) {
      this.logger.log({
        level: 'error',
        message: `Failed to create/update member ${id}`,
        stack: (error as Error).stack,
      });
      throw error;
    }
  }

  async deactivateMember(options: {
    discordId: string;
    guildId: string;
  }): Promise<Member | null> {
    const { discordId, guildId } = options;

    const member = await this.prisma.member.findUnique({
      where: { memberId: { userId: discordId, guildId } },
      include: { roles: true },
    });

    if (!member) {
      throw new NotFoundException('Member not found');
    }

    if (!member.active) {
      throw new BadRequestException(ErrorKey.MEMBER_ALREADY_DEACTIVATED);
    }

    return this.prisma.member.update({
      where: { memberId: { userId: discordId, guildId } },
      data: { active: false, roles: { set: [] } },
    });
  }

  async deleteMembersByGuildId(guildId: string): Promise<number> {
    try {
      const result = await this.prisma.member.updateMany({
        where: { guildId },
        data: { active: false },
      });

      this.logger.log({
        level: 'info',
        message: `Deactivated ${result.count} members from guild ${guildId}`,
      });
      return result.count;
    } catch (error) {
      this.logger.log({
        level: 'error',
        message: `Failed to deactivate members for guild ${guildId}`,
        stack: (error as Error).stack,
      });
      throw error;
    }
  }

  async createBulkRefreshJob(guildId: string, requestedBy: string) {
    const rateLimit = getAdminBulkRefreshRateLimit(this.env);
    const recentJob = await this.prisma.memberRefreshJob.findFirst({
      where: {
        guildId,
        createdAt: {
          gte: new Date(Date.now() - rateLimit),
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (recentJob) {
      throw new BadRequestException({
        message: ErrorKey.BULK_REFRESH_RATE_LIMIT_ACTIVE,
        nextAvailableAt: new Date(recentJob.createdAt.getTime() + rateLimit),
      });
    }

    const members = await this.getGuildMembers(guildId);

    const job = await this.prisma.memberRefreshJob.create({
      data: {
        guildId,
        requestedBy,
        status: 'PENDING',
        totalMembers: members.length,
      },
    });

    await this.amqpConnection.publish(
      DEFAULT_EXCHANGE_NAME,
      RoutingKey.GUILDS_MEMBERS_BULK_REFRESH,
      {
        jobId: job.id,
        guildId,
        memberIds: members.map((m) => m.userId),
      },
    );

    return job;
  }

  async getLatestRefreshJob(guildId: string) {
    const job = await this.prisma.memberRefreshJob.findFirst({
      where: { guildId },
      orderBy: { createdAt: 'desc' },
    });

    return job;
  }

  async getRefreshJobStatus(jobId: number) {
    const job = await this.prisma.memberRefreshJob.findUnique({
      where: { id: jobId },
    });

    if (!job) {
      throw new NotFoundException({
        message: ErrorKey.REFRESH_JOB_NOT_FOUND,
      });
    }

    return job;
  }
}
