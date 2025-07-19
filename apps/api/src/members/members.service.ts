import {
  BadRequestException,
  forwardRef,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import { DeleteMemberRoleDto } from './dto/delete-member-role.dto';
import { AddMemberRoleDto } from 'src/members/dto/add-member-role.dto';
import { AddMemberDto } from 'src/members/dto/add-member.dto';
import { DeleteMemberDto } from 'src/members/dto/delete-member.dto';
import { GuildMemberDto } from 'src/guilds/dto/create-guild.dto';
import { PrismaService } from 'src/db/prisma.service';
import { UpdateMemberDto } from 'src/members/dto/update-member-dto';
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
  private readonly BATCH_SIZE = 100; // Rozmiar batch dla bulk operacji

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
        });
      } catch (error) {
        this.logger.error(
          'Failed to fetch member from Discord, serving stale data',
          (error as Error).stack,
        );

        // Zwróć stale dane z bazy bez względu na TTL
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

  async getMembersByUserId(userId: string): Promise<MemberWithRoles[]> {
    return this.prisma.member.findMany({
      where: { userId },
      include: { roles: true },
    });
  }

  async getGuildMembers(guildId: string): Promise<MemberWithRoles[]> {
    return this.prisma.member.findMany({
      where: { guildId },
      include: { roles: true },
    });
  }

  async bulkGetMembersByGuildId(
    guildId: string,
    memberIds: string[],
  ): Promise<MemberWithRoles[]> {
    return this.prisma.member.findMany({
      where: {
        guildId,
        userId: { in: memberIds },
      },
      include: { roles: true },
    });
  }

  private async processMemberBatch(
    members: GuildMemberDto[],
    guildId: string,
    isUpdate = false,
  ): Promise<number> {
    const operations = members.map(
      async ({ id, name, roleIds, type, banner, avatar }) => {
        try {
          const memberData = {
            userId: id,
            guildId,
            type,
            name,
            banner,
            avatar,
            roles: isUpdate
              ? { set: roleIds.map((roleId) => ({ id: roleId })) }
              : { connect: roleIds.map((roleId) => ({ id: roleId })) },
          };

          return await this.prisma.member.upsert({
            where: { memberId: { userId: id, guildId } },
            create: {
              ...memberData,
              roles: { connect: roleIds.map((roleId) => ({ id: roleId })) },
            },
            update: memberData,
          });
        } catch (error) {
          this.logger.error(
            `Failed to process member ${id}`,
            (error as Error).stack,
          );
          return null;
        }
      },
    );

    const results = await Promise.allSettled(operations);
    const failed = results.filter(
      (result) => result.status === 'rejected',
    ).length;

    if (failed > 0) {
      this.logger.warn(
        `Failed to process ${failed} out of ${members.length} members`,
      );
    }

    return results.filter((result) => result.status === 'fulfilled').length;
  }

  async bulkCreateMembers(
    guildId: string,
    members: GuildMemberDto[],
  ): Promise<number> {
    try {
      const batches = this.chunkArray(members, this.BATCH_SIZE);
      let totalProcessed = 0;

      for (const batch of batches) {
        const processed = await this.processMemberBatch(batch, guildId, false);
        totalProcessed += processed;
      }

      this.logger.log(
        `Successfully processed ${totalProcessed} members for guild ${guildId}`,
      );
      return totalProcessed;
    } catch (error) {
      this.logger.error(
        'Failed to bulk create members',
        (error as Error).stack,
      );
      throw error;
    }
  }

  async bulkUpdateMembers(
    guildId: string,
    members: GuildMemberDto[],
  ): Promise<number> {
    try {
      const batches = this.chunkArray(members, this.BATCH_SIZE);
      let totalProcessed = 0;

      for (const batch of batches) {
        const processed = await this.processMemberBatch(batch, guildId, true);
        totalProcessed += processed;
      }

      this.logger.log(
        `Successfully updated ${totalProcessed} members for guild ${guildId}`,
      );
      return totalProcessed;
    } catch (error) {
      this.logger.error(
        'Failed to bulk update members',
        (error as Error).stack,
      );
      throw error;
    }
  }

  async addMember(data: AddMemberDto): Promise<MemberWithRoles> {
    const { id, roleIds, avatar, guildId, type, name, banner } = data;

    try {
      // Optymalizacja: pobieramy tylko istniejące role jednym zapytaniem
      const existingRoles = await this.prisma.role.findMany({
        where: { id: { in: roleIds } },
        select: { id: true },
      });

      const existingRoleIds = existingRoles.map((role) => role.id);

      const member = await this.prisma.member.upsert({
        where: { memberId: { userId: id, guildId } },
        update: {
          avatar,
          banner,
          type,
          name,
          active: true,
          roles: { set: existingRoleIds.map((roleId) => ({ id: roleId })) },
        },
        create: {
          userId: id,
          guildId,
          avatar,
          name,
          banner,
          type,
          roles: { connect: existingRoleIds.map((roleId) => ({ id: roleId })) },
        },
        include: { roles: true },
      });

      return member;
    } catch (error) {
      this.logger.error(`Failed to add member ${id}`, (error as Error).stack);
      throw error;
    }
  }

  async createOrUpdateMember({
    guildId,
    avatar,
    nick,
    banner,
    roles: roleIds,
    user,
  }: APIGuildMember & { guildId: string }): Promise<MemberWithRoles> {
    const { id } = user;

    try {
      // Optymalizacja: pobieramy tylko istniejące role
      const existingRoles = await this.prisma.role.findMany({
        where: { id: { in: roleIds } },
        select: { id: true },
      });

      const existingRoleIds = existingRoles.map((role) => role.id);
      const memberName = nick || user.username;

      const member = await this.prisma.member.upsert({
        where: { memberId: { userId: id, guildId } },
        update: {
          avatar,
          banner,
          name: memberName,
          roles: { set: existingRoleIds.map((roleId) => ({ id: roleId })) },
        },
        create: {
          userId: id,
          guild: { connect: { id: guildId } },
          avatar,
          name: memberName,
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

  async deleteMembersByGuildId(guildId: string): Promise<number> {
    try {
      const result = await this.prisma.member.deleteMany({
        where: { guildId },
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

  // Utility method dla dzielenia na batche
  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }
}
