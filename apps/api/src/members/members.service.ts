import {
  BadRequestException,
  forwardRef,
  Inject,
  Injectable,
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

@Injectable()
export class MembersService {
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
  }) {
    const { discordId, guildId, userId, refresh, standalone } = options;

    let desiredGuildId = guildId;

    if (refresh || standalone) {
      const guild = await this.guildsService.getGuildById(guildId);

      desiredGuildId = guild.id;
    }

    const now = new Date();
    const cacheTtl = refresh ? REFRESH_PERMISSIONS_TTL : MEMBER_CACHE_TTL;

    const member = await this.prisma.member.findUnique({
      where: {
        memberId: { userId: discordId, guildId: desiredGuildId },
        updatedAt: { gte: new Date(now.getTime() - cacheTtl) },
      },
      include: { roles: true },
    });

    if (member && refresh) {
      throw new BadRequestException(ErrorKey.MEMBER_TTL_ACTIVE);
    }

    if (!member) {
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
    }

    return member;
  }

  async getMembersByUserId(userId: string) {
    const members = await this.prisma.member.findMany({
      where: { userId: userId },
    });
    return members;
  }

  async getGuildMembers(guildId: string) {
    const members = await this.prisma.member.findMany({
      where: { guildId },
      include: { roles: true },
    });

    return members;
  }

  async bulkGetMembersByGuildId(guildId: string, memberIds: string[]) {
    const members = await this.prisma.member.findMany({
      where: {
        guildId,
        userId: {
          in: memberIds,
        },
      },
    });

    return members;
  }

  async bulkCreateMembers(guildId: string, members: GuildMemberDto[]) {
    try {
      await Promise.all(
        members.map(({ id, name, roleIds, type, banner, avatar }) => {
          const member = {
            userId: id,
            guildId,
            type,
            name,
            banner,
            avatar,
            roles: {
              connect: roleIds.map((id) => ({ id })),
            },
          };

          return this.prisma.member
            .upsert({
              where: { memberId: { userId: id, guildId } },
              create: member,
              update: member,
            })
            .catch(console.log);
        }),
      );
    } catch (error) {
      console.log(error);
    }

    return;
  }

  async bulkUpdateMembers(guildId: string, members: GuildMemberDto[]) {
    try {
      await Promise.all(
        members.map(({ id, name, roleIds, type, banner, avatar }) => {
          return this.prisma.member.upsert({
            where: { memberId: { userId: id, guildId } },
            update: {
              name,
              type,
              banner,
              avatar,
              roles: {
                set: roleIds.map((id) => ({ id })),
              },
            },
            create: {
              userId: id,
              guildId,
              name,
              type,
              banner,
              avatar,
              roles: {
                connect: roleIds.map((id) => ({ id })),
              },
            },
          });
        }),
      ).catch(console.log);
    } catch (error) {
      console.log(error);
    }

    return;
  }

  async addMember(data: AddMemberDto) {
    const { id, roleIds, avatar, guildId, type, name, banner } = data;

    const roles = await this.prisma.role.findMany({
      where: {
        id: {
          in: roleIds,
        },
      },
    });

    const member = await this.prisma.member.upsert({
      where: { memberId: { userId: id, guildId } },
      update: {
        avatar,
        banner,
        type,
        name,
        active: true,
        roles: {
          set: roles.map(({ id }) => ({ id })),
        },
      },
      create: {
        userId: id,
        guildId,
        avatar,
        name,
        banner,
        type,
        roles: {
          connect: roles.map(({ id }) => ({ id })),
        },
      },
    });

    return member;
  }

  async createOrUpdateMember({
    guildId,
    avatar,
    nick,
    banner,
    roles: roleIds,
    user,
  }: APIGuildMember & { guildId: string }) {
    const { id } = user;

    const roles = await this.prisma.role.findMany({
      where: {
        id: {
          in: roleIds,
        },
      },
    });

    const member = await this.prisma.member.upsert({
      where: { memberId: { userId: id, guildId } },
      update: {
        avatar,
        banner,
        name: nick || user.username,
        roles: {
          set: roles.map(({ id }) => ({ id })),
        },
      },
      create: {
        userId: id,
        guild: {
          connect: { id: guildId },
        },
        avatar,
        name: nick || user.username,
        banner,
        roles: {
          connect: roles.map(({ id }) => ({ id })),
        },
      },
      include: { roles: true },
    });

    return member;
  }

  async deleteMember({ id, guildId }: DeleteMemberDto) {
    await this.prisma.member.update({
      where: { memberId: { userId: id, guildId } },
      data: {
        roles: {
          set: [],
        },
        active: false,
      },
    });

    return;
  }

  async addMemberRole({ id, guildId, roleId }: AddMemberRoleDto) {
    await this.prisma.member.update({
      where: { memberId: { userId: id, guildId } },
      data: {
        roles: {
          connect: {
            id: roleId,
          },
        },
      },
    });

    return;
  }

  async deleteMemberRole({ roleId, guildId, id }: DeleteMemberRoleDto) {
    await this.prisma.member.update({
      where: { memberId: { userId: id, guildId } },
      data: {
        roles: {
          disconnect: {
            id: roleId,
          },
        },
      },
    });

    return;
  }

  async deleteMembersByGuildId(guildId: string) {
    try {
      await this.prisma.member.deleteMany({ where: { guildId } });
    } catch (error) {
      console.log(error);
    }

    return;
  }
}
