import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import {
  Inject,
  Injectable,
  NotFoundException,
  forwardRef,
} from '@nestjs/common';
import { Permission } from '@prisma/client';
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

@Injectable()
export class GuildsService {
  constructor(
    private readonly membersService: MembersService,
    private readonly rolesService: RolesService,
    @Inject(forwardRef(() => LootlogConfigService))
    private lootlogConfigService: LootlogConfigService,
    @Inject(forwardRef(() => UsersService))
    private usersService: UsersService,
    private readonly amqpConnection: AmqpConnection,
    private readonly prisma: PrismaService,
  ) {}

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

  async getGuildPermissions(userId: string, guildId: string) {
    const guild = await this.getGuildById(guildId);

    const member = await this.prisma.member.findUnique({
      where: { memberId: { userId, guildId: guild.id } },
      include: { roles: true, guild: true },
    });

    const permissions = member.roles.reduce((acc: Permission[], role) => {
      return acc.concat(role.permissions);
    }, []);

    if (userId === member.guild.ownerId) {
      return { data: Object.values(Permission), guild };
    }

    return { data: permissions, guild };
  }

  async updateGuildConfig(guildId: string, data: UpdateGuildConfigDto) {
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

    // const users: APIUser[] = data.members.map((member) => {
    //   return {
    //     id: member.id,
    //     avatar: member.avatar,
    //     discriminator: member.discriminator,
    //     banner: member.banner,
    //     global_name: member.globalName,
    //     username: member.username,
    //   };
    // });

    // await this.usersService.bulkCreateUsers(users);

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
