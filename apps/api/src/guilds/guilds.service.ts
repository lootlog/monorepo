import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  forwardRef,
  Logger,
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
import { LootlogConfigService } from 'src/lootlog-config/lootlog-config.service';
import { RESTRICTED_VANITY_URLS } from 'src/guilds/constants/restricted-vanity-urls';
import { DEFAULT_EXCHANGE_NAME } from 'src/config/rabbitmq.config';
import { RoutingKey } from 'src/enum/routing-key.enum';
import { DiscordService } from 'src/discord/discord.service';

@Injectable()
export class GuildsService {
  private readonly logger = new Logger(GuildsService.name);

  constructor(
    @Inject(forwardRef(() => MembersService))
    private readonly membersService: MembersService,
    private readonly rolesService: RolesService,
    @Inject(forwardRef(() => LootlogConfigService))
    private lootlogConfigService: LootlogConfigService,
    private readonly amqpConnection: AmqpConnection,
    private readonly prisma: PrismaService,
    private readonly discordService: DiscordService,
  ) {}

  async getUserGuilds(discordId: string, userId: string) {
    const discordGuilds = await this.discordService.getUserGuilds(userId);
    const guildIds = discordGuilds.map((guild) => guild.id);

    const guilds = await this.prisma.guild.findMany({
      where: {
        id: { in: guildIds },
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

  async getGuildPermissions(options: {
    discordId: string;
    userId: string;
    guildId: string;
  }) {
    const { discordId, userId, guildId } = options;
    const guild = await this.getGuildById(guildId);

    const member = await this.membersService.getGuildMemberById({
      userId,
      discordId,
      guildId: guild.id,
    });

    const isOwner = guild.ownerId === discordId;
    const permissions = isOwner
      ? Object.values(Permission)
      : member?.roles.reduce((acc: Permission[], role) => {
          return acc.concat(role.permissions);
        }, []) || [];

    const uniquePermissions = Array.from(new Set(permissions));

    return {
      permissions: uniquePermissions,
      guild,
      roles: member?.roles || [],
    };
  }

  async getMultipleGuildsPermissions(discordId: string, guildIds: string[]) {
    // Używamy Promise.all dla równoległego pobierania danych
    const [guilds, members] = await Promise.all([
      this.prisma.guild.findMany({
        where: { id: { in: guildIds } },
      }),
      this.prisma.member.findMany({
        where: {
          userId: discordId,
          guildId: { in: guildIds },
        },
        include: { roles: true, guild: true },
      }),
    ]);

    // Tworzymy mapę dla szybszego wyszukiwania
    const memberMap = new Map(members.map((m) => [m.guildId, m]));
    const allPermissions = Object.values(Permission);

    const result = guilds.map((guild) => {
      const member = memberMap.get(guild.id);

      if (!member) {
        return { guild, permissions: [], roles: [] };
      }

      const permissions =
        discordId === guild.ownerId
          ? allPermissions
          : member.roles.reduce((acc: Permission[], role) => {
              return acc.concat(role.permissions);
            }, []);

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
    return this.prisma.guild.findMany({
      where: { id: { in: ids } },
    });
  }

  async createGuild(data: CreateGuildDto) {
    let guild;

    try {
      // Używamy upsert zamiast find + create
      guild = await this.prisma.guild.upsert({
        where: { id: data.guildId },
        update: {
          name: data.name,
          icon: data.icon,
          ownerId: data.ownerId,
        },
        create: {
          id: data.guildId,
          name: data.name,
          icon: data.icon,
          ownerId: data.ownerId,
        },
      });
    } catch (error) {
      this.logger.error(
        'Failed to create/update guild',
        error instanceof Error ? error.stack : error,
      );
      throw error;
    }

    // Wykonujemy operacje równolegle
    await Promise.all([
      this.rolesService.bulkCreateRoles(data.guildId, data.roles),
      this.lootlogConfigService.createLootlogConfig(data.guildId),
    ]);

    return guild;
  }

  async updateGuild(data: UpdateGuildDto) {
    try {
      await this.prisma.guild.update({
        where: { id: data.guildId },
        data: {
          name: data.name,
          icon: data.icon,
          ownerId: data.ownerId,
        },
      });
    } catch (error) {
      this.logger.error(
        'Failed to update guild',
        error instanceof Error ? error.stack : error,
      );
      throw error;
    }
  }

  async deleteGuild({ guildId }: DeleteGuildDto) {
    try {
      // Używamy transakcji dla atomiczności operacji
      await this.prisma.$transaction(async (tx) => {
        // Usuwamy w odpowiedniej kolejności (zależności najpierw)
        await Promise.all([
          tx.lootlogConfigNpc.deleteMany({
            where: { lootlogConfigId: guildId },
          }),
          tx.timer.deleteMany({ where: { guildId } }),
        ]);

        await tx.lootlogConfig.deleteMany({ where: { id: guildId } });

        // Usuwamy członków i role równolegle
        await Promise.all([
          this.membersService.deleteMembersByGuildId(guildId),
          this.rolesService.deleteRolesByGuildId(guildId),
        ]);
      });
    } catch (error) {
      this.logger.error(
        'Failed to delete guild',
        error instanceof Error ? error.stack : error,
      );
      throw error;
    }
  }

  async handleGuildSyncTrigger(guildId: string) {
    try {
      this.amqpConnection.publish(
        DEFAULT_EXCHANGE_NAME,
        RoutingKey.GUILDS_SYNC_TRIGGER,
        { guildId },
      );
    } catch (error) {
      this.logger.error(
        'Failed to trigger guild sync',
        error instanceof Error ? error.stack : error,
      );
      throw error;
    }
  }

  async handleGuildSync(data: CreateGuildDto) {
    const guild = await this.getGuildById(data.guildId);

    if (!guild) {
      throw new NotFoundException({ message: ErrorKey.GUILD_NOT_FOUND });
    }

    // Wykonujemy operacje równolegle
    await Promise.all([
      this.rolesService.bulkUpdateRoles(data.guildId, data.roles),
      this.lootlogConfigService.createLootlogConfig(data.guildId),
    ]);
  }
}
