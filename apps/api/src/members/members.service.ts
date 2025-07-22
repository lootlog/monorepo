import {
  BadRequestException,
  forwardRef,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/db/prisma.service';
import {
  MEMBER_CACHE_TTL,
  REFRESH_PERMISSIONS_TTL,
} from 'src/members/constants/member-cache.constant';
import { DiscordService } from 'src/discord/discord.service';
import { APIGuildMember } from 'discord-api-types/v10';
import { ErrorKey } from 'src/members/enum/error-key.enum';
import { GuildsService } from 'src/guilds/guilds.service';
import { Member, Role } from 'generated/client';

type MemberWithRoles = Member & { roles: Role[] };

@Injectable()
export class MembersService {
  private readonly logger = new Logger(MembersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly discordService: DiscordService,
    @Inject(forwardRef(() => GuildsService))
    private readonly guildsService: GuildsService,
  ) {}

  async getGuildMemberById(options: {
    discordId: string;
    guildId: string;
    userId: string;
    refresh?: boolean;
    standalone?: boolean;
  }): Promise<MemberWithRoles | null> {
    const {
      discordId,
      guildId,
      userId,
      refresh = false,
      standalone = false,
    } = options;

    let desiredGuildId = guildId;

    if (refresh || standalone) {
      const guild = await this.guildsService.getGuildById(guildId);
      desiredGuildId = guild.id;
    }

    const now = new Date();
    const cacheTtl = refresh ? REFRESH_PERMISSIONS_TTL : MEMBER_CACHE_TTL;
    const cacheExpiry = new Date(now.getTime() - cacheTtl);

    const member = await this.prisma.member.findUnique({
      where: {
        memberId: { userId: discordId, guildId: desiredGuildId },
        updatedAt: { gte: cacheExpiry },
      },
      include: { roles: true },
    });

    if (member && refresh) {
      throw new BadRequestException(ErrorKey.MEMBER_TTL_ACTIVE);
    }

    if (!member) {
      try {
        const discordMember = await this.discordService.getGuildMember({
          guildId: desiredGuildId,
          userId,
        });

        if (!discordMember) {
          return null;
        }

        return this.createOrUpdateMember({
          ...discordMember,
          guildId: desiredGuildId,
          globalUserId: userId,
        });
      } catch (error) {
        this.logger.error(
          'Failed to fetch member from Discord, serving stale data',
          (error as Error).stack,
        );

        if (error instanceof NotFoundException) {
          await this.deactivateMember({
            discordId,
            guildId,
          });

          return null;
        }

        if (refresh) {
          throw new HttpException(
            'Member TTL is active',
            HttpStatus.TOO_MANY_REQUESTS,
          );
        }

        const staleMember = await this.prisma.member.findUnique({
          where: {
            memberId: { userId: discordId, guildId: desiredGuildId },
          },
          include: { roles: true },
        });

        return staleMember;
      }
    }

    return member;
  }

  async refreshMember(options: { discordId: string; guildId: string }) {
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
      ...options,
      userId: member.globalUserId,
      refresh: true,
      standalone: true,
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
      const existingRoles = await this.prisma.role.findMany({
        where: { id: { in: roleIds } },
        select: { id: true },
      });

      const existingRoleIds = existingRoles.map((role) => role.id);
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
      this.logger.error(
        `Failed to create/update member ${id}`,
        (error as Error).stack,
      );
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

      this.logger.log(`Deleted ${result.count} members from guild ${guildId}`);
      return result.count;
    } catch (error) {
      this.logger.error(
        `Failed to delete members for guild ${guildId}`,
        (error as Error).stack,
      );
      throw error;
    }
  }
}
