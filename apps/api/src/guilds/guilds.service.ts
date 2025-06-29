import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  forwardRef,
} from '@nestjs/common';
import { Permission } from 'generated/client';
import { PrismaService } from 'src/db/prisma.service';
import { CreateGuildDto } from 'src/guilds/dto/create-guild.dto';
import { DeleteGuildDto } from 'src/guilds/dto/delete-guild.dto';
import { UpdateGuildDto } from 'src/guilds/dto/update-guild.dto';
import { UpdateGuildConfigDto } from 'src/guilds/dto/update-guild-config.dto';
import { ErrorKey } from 'src/guilds/enum/error-key.enum';
import { MembersService } from 'src/members/members.service';
import { RolesService } from 'src/roles/roles.service';
import { generateSlug } from 'src/shared/utils/generate-slug';
import { UsersService } from 'src/users/users.service';
import { LootlogConfigService } from 'src/lootlog-config/lootlog-config.service';
import { RESTRICTED_VANITY_URLS } from 'src/guilds/constants/restricted-vanity-urls';

@Injectable()
export class GuildsService {
  constructor(
    private readonly membersService: MembersService,
    private readonly rolesService: RolesService,
    @Inject(forwardRef(() => LootlogConfigService))
    private lootlogConfigService: LootlogConfigService,
    @Inject(forwardRef(() => UsersService))
    private readonly amqpConnection: AmqpConnection,
    private readonly prisma: PrismaService,
  ) {}

  async getUserGuilds(discordId: string) {
    const guilds = await this.prisma.guild.findMany({
      where: {
        OR: [
          {
            ownerId: discordId,
          },
          {
            members: {
              some: {
                userId: discordId,
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

  async getGuildById(idOrVanityURL: string) {
    const guild = await this.prisma.guild.findFirst({
      where: { OR: [{ id: idOrVanityURL }, { vanityUrl: idOrVanityURL }] },
    });

    if (!guild) {
      throw new NotFoundException({ message: ErrorKey.GUILD_NOT_FOUND });
    }

    return guild;
  }

  async getGuildsForRequiredPermissions(
    userId: string,
    requiredPermissions: Permission[],
  ) {
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
                      hasSome: requiredPermissions,
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

  async getGuildPermissions(discordId: string, guildId: string) {
    const guild = await this.getGuildById(guildId);

    const member = await this.prisma.member.findUnique({
      where: { memberId: { userId: discordId, guildId: guild.id } },
      include: { roles: true, guild: true },
    });

    const permissions = member.roles.reduce((acc: Permission[], role) => {
      return acc.concat(role.permissions);
    }, []);

    if (discordId === member.guild.ownerId) {
      return {
        permissions: Object.values(Permission),
        guild,
        roles: member.roles,
      };
    }

    return { permissions, guild, roles: member.roles };
  }

  async getMultipleGuildsPermissions(discordId: string, guildIds: string[]) {
    const guilds = await this.prisma.guild.findMany({
      where: { id: { in: guildIds } },
    });

    const members = await this.prisma.member.findMany({
      where: {
        userId: discordId,
        guildId: { in: guildIds },
      },
      include: { roles: true, guild: true },
    });

    const result = guilds.map((guild) => {
      const member = members.find((m) => m.guildId === guild.id);

      if (!member) {
        return { guild, permissions: [], roles: [] };
      }

      let permissions = member.roles.reduce((acc: Permission[], role) => {
        return acc.concat(role.permissions);
      }, []);

      if (discordId === guild.ownerId) {
        permissions = Object.values(Permission);
      }

      return { guild, permissions, roles: member.roles };
    });

    return result;
  }

  async updateGuildConfig(guildId: string, data: UpdateGuildConfigDto) {
    if (RESTRICTED_VANITY_URLS.includes(data.vanityUrl)) {
      throw new BadRequestException({
        message: ErrorKey.GUILDS_VANITY_URL_RESTRICTED,
      });
    }

    const guild = await this.prisma.guild.update({
      where: { id: guildId },
      data: {
        vanityUrl: generateSlug(data.vanityUrl),
      },
    });

    return guild;
  }

  async getWorldsByGuildId(guildId: string) {
    const worlds = await this.prisma.timer.findMany({
      where: { guildId },
      select: { world: true },
      distinct: ['world'],
    });

    return worlds.map((world) => world.world);
  }

  async getMultipleGuildsByIds(ids: string[]) {
    const guilds = await this.prisma.guild.findMany({
      where: { id: { in: ids } },
    });

    return guilds;
  }

  async createGuild(data: CreateGuildDto) {
    let guild;

    try {
      guild = await this.prisma.guild.create({
        data: {
          id: data.guildId,
          name: data.name,
          icon: data.icon,
          ownerId: data.ownerId,
        },
      });
    } catch (error) {
      console.log(error);
    }

    await this.rolesService.bulkCreateRoles(data.guildId, data.roles);
    await this.membersService.bulkCreateMembers(data.guildId, data.members);
    await this.lootlogConfigService.createLootlogConfig(data.guildId);

    return guild;
  }

  async updateGuild(data: UpdateGuildDto) {
    await this.prisma.guild.update({
      where: { id: data.guildId },
      data: {
        name: data.name,
        icon: data.icon,
        ownerId: data.ownerId,
      },
    });

    return;
  }

  async deleteGuild({ guildId }: DeleteGuildDto) {
    try {
      await this.prisma.lootlogConfigNpc.deleteMany({
        where: { lootlogConfigId: guildId },
      });
      await this.prisma.lootlogConfig.delete({ where: { id: guildId } });
      // await this.prisma.lootItems.deleteMany({
      //   where: {
      //     loot: {
      //       guildId,
      //     },
      //   },
      // });
      await this.prisma.loot.deleteMany({ where: { guildId } });
      await this.prisma.timer.deleteMany({ where: { guildId } });

      await this.membersService.deleteMembersByGuildId(guildId);
      await this.rolesService.deleteRolesByGuildId(guildId);

      await this.prisma.guild.delete({
        where: { id: guildId },
      });
    } catch (error) {
      console.log(error);
    }

    return;
  }
}
