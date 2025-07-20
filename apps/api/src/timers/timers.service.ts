import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import {
  Permission,
  Prisma,
  Timer,
  NpcType,
  Guild,
  Role,
} from 'generated/client';
import { DEFAULT_EXCHANGE_NAME } from 'src/config/rabbitmq.config';
import { PrismaService } from 'src/db/prisma.service';
import { getNpcTypeByWt } from 'src/shared/utils/get-npc-type-by-wt';
import { getProfByShortname } from 'src/shared/utils/get-prof-by-shortname';
import { CreateTimerDto } from 'src/timers/dto/create-timer.dto';
import { ErrorKey } from 'src/timers/enum/error-key.enum';
import { GuildsService } from 'src/guilds/guilds.service';
import { GetTimersDto } from 'src/timers/dto/get-timers.dto';
import { UserLootlogConfigService } from 'src/user-lootlog-config/user-lootlog-config.service';
import { ResetTimerDto } from 'src/timers/dto/reset-timer.dto';
import { DEFAULT_RESPAWN_RANDOMNESS } from 'src/timers/constants/respawn';
import { CreateManualTimerDto } from 'src/timers/dto/create-manual-timer.dto';
import { generateUniqueIntId } from 'src/shared/utils/generate-unique-int-id';
import { RoutingKey } from 'src/enum/routing-key.enum';
import { isAdministrativeUser } from 'src/shared/permissions/is-administrative-user';
import { canViewNpcTimer } from 'src/shared/utils/can-view-npc-timer';

function parseNpc(npc: any) {
  return typeof npc === 'string' ? JSON.parse(npc) : npc;
}

@Injectable()
export class TimersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly amqpConnection: AmqpConnection,
    private readonly guildsService: GuildsService,
    private readonly userLootlogConfigService: UserLootlogConfigService,
  ) {}

  async createTimer(discordId: string, userId: string, data: CreateTimerDto) {
    const now = new Date();
    if (data.npc.wt < 19)
      throw new BadRequestException({ message: ErrorKey.WT_TOO_LOW });
    const [guilds, config] = await Promise.all([
      this.guildsService.getGuildsForRequiredPermissions(discordId, userId, [
        Permission.LOOTLOG_WRITE,
      ]),
      this.userLootlogConfigService.getLootlogCharacterConfig(
        discordId,
        data.accountId,
        data.characterId,
      ),
    ]);
    if (guilds.length === 0) throw new ForbiddenException();
    const filteredGuilds = guilds.filter(
      (guild) => !config?.addTimersBlacklistGuildIds?.includes(guild.id),
    );
    const { minSpawnTime, maxSpawnTime } = this.calculateRespawnTime(
      data.respBaseSeconds,
      data.respawnRandomness,
      now,
    );
    const newTimers = filteredGuilds.map((guild) => ({
      where: {
        timerId: {
          guildId: guild.id,
          world: data.world,
          npcId: data.npc.id,
        },
      },
      create: {
        maxSpawnTime,
        minSpawnTime,
        world: data.world,
        npcId: data.npc.id,
        latestRespBaseSeconds: data.respBaseSeconds,
        latestRespawnRandomness: data.respawnRandomness,
        guild: { connect: { id: guild.id } },
        member: {
          connect: { memberId: { userId: discordId, guildId: guild.id } },
        },
        npc: {
          id: data.npc.id,
          name: data.npc.name,
          prof: getProfByShortname(data.npc.prof),
          location: data.npc.location,
          wt: data.npc.wt,
          lvl: data.npc.lvl,
          type: getNpcTypeByWt(data.npc.wt, data.npc.prof, data.npc.type),
          icon: data.npc.icon,
          margonemType: data.npc.type,
        },
      },
      update: {
        maxSpawnTime,
        minSpawnTime,
        latestRespBaseSeconds: data.respBaseSeconds,
        latestRespawnRandomness:
          data.respawnRandomness ?? DEFAULT_RESPAWN_RANDOMNESS,
        member: {
          connect: { memberId: { userId: discordId, guildId: guild.id } },
        },
      },
    }));
    const newTimersUpsert = await Promise.all(
      newTimers.map((timer) => this.prisma.timer.upsert(timer)),
    );
    newTimersUpsert.forEach((newTimer) => this.emitUpdateTimer(newTimer));
    return;
  }

  async createManualTimer(
    discordId: string,
    guildId: string,
    data: CreateManualTimerDto,
  ) {
    const now = new Date();
    const { minSpawnTime, maxSpawnTime } = this.calculateRespawnTime(
      data.respBaseSeconds,
      data.respawnRandomness,
      now,
    );
    const npcId = generateUniqueIntId();
    const newTimer = await this.prisma.timer.create({
      data: {
        maxSpawnTime,
        minSpawnTime,
        npcId,
        npc: {
          id: npcId,
          name: data.name,
          prof: '',
          location: '',
          wt: '',
          lvl: 0,
          type: '',
          icon: '',
          margonemType: 999,
        },
        world: data.world,
        latestRespBaseSeconds: data.respBaseSeconds,
        latestRespawnRandomness:
          data.respawnRandomness ?? DEFAULT_RESPAWN_RANDOMNESS,
        guild: { connect: { id: guildId } },
        member: {
          connect: { memberId: { userId: discordId, guildId: guildId } },
        },
      },
    });
    this.emitUpdateTimer(newTimer);
    return;
  }

  async getTimers(
    { world }: GetTimersDto,
    guild: Guild,
    permissions: Permission[],
    roles: Role[],
  ) {
    const now = new Date();
    const administrativeUser = isAdministrativeUser(permissions);

    const timers = await this.prisma.timer.findMany({
      where: {
        guildId: guild.id,
        maxSpawnTime: { gt: now.toISOString() },
        world,
      },
      orderBy: { maxSpawnTime: 'desc' },
      include: { member: true },
    });

    const filteredTimers = timers.filter((timer) => {
      if (administrativeUser) return true;
      const npc = parseNpc(timer.npc);

      return canViewNpcTimer(npc, roles);
    });
    return filteredTimers;
  }

  async getAllTimers(
    discordId: string,
    userId: string,
    { world }: GetTimersDto,
  ) {
    const now = new Date();
    const guilds = await this.guildsService.getGuildsForRequiredPermissions(
      discordId,
      userId,
      [Permission.LOOTLOG_READ],
    );
    if (guilds.length === 0) throw new ForbiddenException();
    const guildIds = guilds.map((guild) => guild.id);
    const permissionsPerGuild =
      await this.guildsService.getMultipleGuildsPermissions(
        discordId,
        guildIds,
      );

    const results: Timer[] = [];
    for (const guild of guilds) {
      const guildId = guild.id;
      const guildPermissionsAndRoles = permissionsPerGuild.find(
        (p) => p.guild.id === guildId,
      );

      const permissions = guildPermissionsAndRoles?.permissions || [];
      const roles = guildPermissionsAndRoles?.roles || [];
      const administrativeUser = isAdministrativeUser(permissions);

      const timers = await this.prisma.timer.findMany({
        where: {
          guildId,
          maxSpawnTime: { gt: now.toISOString() },
          world,
        },
        orderBy: { maxSpawnTime: 'desc' },
        include: { member: true },
      });

      const filtered = timers.filter((timer) => {
        if (administrativeUser) return true;
        const npc = parseNpc(timer.npc);

        return canViewNpcTimer(npc, roles);
      });

      results.push(...filtered);
    }
    return results;
  }

  async resetTimer(
    discordId: string,
    guildId: string,
    npcId: string,
    data: ResetTimerDto,
  ) {
    const now = new Date();
    const timer = await this.prisma.timer.findUnique({
      where: {
        timerId: {
          guildId: guildId,
          world: data.world,
          npcId: parseInt(npcId, 10),
        },
      },
    });
    if (!timer)
      throw new BadRequestException({ message: ErrorKey.TIMER_NOT_FOUND });
    const { minSpawnTime, maxSpawnTime } = this.calculateRespawnTime(
      timer.latestRespBaseSeconds,
      timer.latestRespawnRandomness,
      now,
    );
    const updatedTimer = await this.prisma.timer.update({
      where: {
        timerId: {
          guildId: guildId,
          world: data.world,
          npcId: parseInt(npcId, 10),
        },
      },
      data: {
        minSpawnTime,
        maxSpawnTime,
        member: {
          connect: {
            memberId: {
              userId: discordId,
              guildId: guildId,
            },
          },
        },
      },
    });
    this.emitUpdateTimer(updatedTimer);
  }

  async deleteTimer(guildId: string, npcId: string, world: string) {
    try {
      await this.prisma.timer.delete({
        where: {
          timerId: {
            guildId,
            world,
            npcId: parseInt(npcId, 10),
          },
        },
      });
      this.emitDeleteTimer({ npcId: parseInt(npcId, 10), world, guildId });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new BadRequestException({ message: ErrorKey.TIMER_NOT_FOUND });
        }
      }
      throw error;
    }
  }

  async emitUpdateTimer(payload: Timer) {
    this.amqpConnection.publish(
      DEFAULT_EXCHANGE_NAME,
      RoutingKey.GUILDS_TIMERS_UPDATE,
      payload,
    );
  }

  async emitDeleteTimer(payload: Partial<Timer>) {
    this.amqpConnection.publish(
      DEFAULT_EXCHANGE_NAME,
      RoutingKey.GUILDS_TIMERS_DELETE,
      payload,
    );
  }

  calculateRespawnTime(
    respBaseSeconds: number,
    respawnRandomness: number = DEFAULT_RESPAWN_RANDOMNESS,
    now: Date,
  ) {
    const date = new Date(now).getTime();
    const respMs = respBaseSeconds * 1000;
    const multiplier = respawnRandomness / 100;
    const maxSpawnTime = Math.round(respMs * multiplier + respMs);
    const minSpawnTime = Math.round(respMs - respMs * multiplier);
    return {
      minSpawnTime: new Date(date + minSpawnTime),
      maxSpawnTime: new Date(date + maxSpawnTime),
    };
  }
}
