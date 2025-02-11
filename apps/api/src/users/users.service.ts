import { Injectable } from '@nestjs/common';
import { Permission } from '@prisma/client';
import { APIUser } from 'discord-api-types/v10';
import { PrismaService } from 'src/db/prisma.service';
import { DiscordService } from 'src/discord/discord.service';
import { GuildsService } from 'src/guilds/guilds.service';
import { MembersService } from 'src/members/members.service';
import { USER_REFRESH_TIME } from 'src/users/constants/user-refresh.constant';
import { GetManageableGuildsDto } from 'src/users/dto/get-manageable-guilds';

@Injectable()
export class UsersService {
  constructor(
    private readonly discordService: DiscordService,
    private readonly membersService: MembersService,
    private readonly guildsService: GuildsService,
    private readonly prisma: PrismaService,
  ) {}

  async getUserById(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: {
        id: userId,
      },
    });

    return user;
  }

  async createUser(discordUser: APIUser) {
    const user = await this.prisma.user.create({
      data: {
        id: discordUser.id,
        username: discordUser.username,
        discriminator: discordUser.discriminator,
        avatar: this.getUserAvatarURL(discordUser),
        banner: discordUser.banner,
        globalName: discordUser.global_name,
      },
    });

    return user;
  }

  async bulkCreateUsers(users: APIUser[]) {
    const userRecords = users.map((user) => ({
      id: user.id,
      username: user.username,
      discriminator: user.discriminator,
      avatar: this.getUserAvatarURL(user),
      email: user.email,
      banner: user.banner,
      globalName: user.global_name,
    }));

    const createdUsers = await this.prisma.user.createMany({
      data: userRecords,
      skipDuplicates: true,
    });

    return createdUsers;
  }

  async createOrUpdateUser(discordUser: APIUser) {
    const user = await this.getUserById(discordUser.id);

    if (!user) {
      return this.createUser(discordUser);
    }

    const updatedUser = await this.prisma.user.update({
      where: {
        id: discordUser.id,
      },
      data: {
        username: discordUser.username,
        discriminator: discordUser.discriminator,
        avatar: this.getUserAvatarURL(discordUser),
        banner: discordUser.banner,
        globalName: discordUser.global_name,
      },
    });

    return updatedUser;
  }

  async getUserProfile(userId: string) {
    const user = await this.getUserById(userId);

    if (!user || user.updatedAt.getTime() < Date.now() - USER_REFRESH_TIME) {
      const discordUser = await this.discordService.getDiscordProfile(userId);
      const newUser = await this.createOrUpdateUser(discordUser);

      return newUser;
    }

    return user;
  }

  async getUserGuilds(userId: string) {
    const guilds = await this.prisma.guild.findMany({
      where: {
        OR: [
          {
            ownerId: userId,
          },
          {
            members: {
              some: {
                userId,
                roles: {
                  some: {
                    permissions: {
                      has: Permission.LOOTLOG_READ,
                    },
                  },
                },
              },
            },
          },
        ],
      },
    });

    return guilds;
  }

  async getManageableGuilds(userId: string, data: GetManageableGuildsDto) {
    const guilds = await this.discordService.getManageableDiscordGuilds(userId);

    if (!data.skipConfigured) {
      return guilds;
    }

    const existingGuilds = await this.guildsService.getMultipleGuildsByIds(
      // @ts-ignore
      guilds.map((guild) => guild.id as string),
    );

    const notExistingGuilds = guilds.filter(
      (guild) =>
        !existingGuilds.some(
          // @ts-ignore
          (existingGuild) => existingGuild.id === (guild.id as string),
        ),
    );

    return notExistingGuilds;
  }

  getUserAvatarURL(user: APIUser) {
    return user.avatar
      ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.webp`
      : null;
  }
}
