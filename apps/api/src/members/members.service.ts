import { Injectable } from '@nestjs/common';
import { DeleteMemberRoleDto } from './dto/delete-member-role.dto';
import { AddMemberRoleDto } from 'src/members/dto/add-member-role.dto';
import { AddMemberDto } from 'src/members/dto/add-member.dto';
import { DeleteMemberDto } from 'src/members/dto/delete-member.dto';
import { GuildMemberDto } from 'src/guilds/dto/create-guild.dto';
import { PrismaService } from 'src/db/prisma.service';
import { UpdateMemberDto } from 'src/members/dto/update-member-dto';

@Injectable()
export class MembersService {
  constructor(private readonly prisma: PrismaService) {}

  async getGuildMemberById(memberId: string, guildId: string) {
    const member = await this.prisma.member.findUnique({
      where: { memberId: { userId: memberId, guildId } },
      include: { roles: true },
    });

    if (!member) {
      return null;
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
      include: { user: true, roles: true, loots: true, guild: true },
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
        members.map(({ id, username, displayName, roleIds, type }) => {
          const member = {
            userId: id,
            guildId,
            type,
            name: displayName ?? username,
            roles: {
              connect: roleIds.map((id) => ({ id })),
            },
          };

          return this.prisma.member.create({ data: member });
        }),
      );
    } catch (error) {
      console.log(error);
    }

    return;
  }

  async addMember(data: AddMemberDto) {
    const {
      id,
      roleIds,
      avatar,
      guildId,
      type,
      name,
      globalName,
      username,
      discriminator,
      banner,
    } = data;

    await this.prisma.user.upsert({
      where: { id },
      update: {
        avatar,
        username,
        discriminator,
        banner,
        globalName,
      },
      create: {
        id,
        avatar,
        username,
        discriminator,
        banner,
        globalName,
      },
    });

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
        name,
        type,
        active: true,
        roles: {
          set: roles.map(({ id }) => ({ id })),
        },
      },
      create: {
        userId: id,
        guildId,
        name,
        type,
        roles: {
          connect: roles.map(({ id }) => ({ id })),
        },
      },
    });

    return member;
  }

  async updateMember({
    id,
    guildId,
    name,
    avatar,
    globalName,
    username,
    discriminator,
    banner,
    roleIds,
    type,
  }: UpdateMemberDto) {
    await this.prisma.user.update({
      where: { id },
      data: {
        avatar,
        username,
        discriminator,
        banner,
        globalName,
      },
    });

    await this.prisma.member.update({
      where: {
        memberId: {
          userId: id,
          guildId,
        },
      },
      data: {
        name,
        type,
        roles: {
          set: roleIds.map((id) => ({ id })),
        },
      },
    });

    return;
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
    await this.prisma.member.deleteMany({ where: { guildId } });

    return;
  }
}
