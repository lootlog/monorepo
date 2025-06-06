import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import { BadRequestException, Injectable } from '@nestjs/common';
import { Permission, Timer } from '@prisma/client';
import { DEFAULT_EXCHANGE_NAME } from 'src/config/rabbitmq.config';
import { PrismaService } from 'src/db/prisma.service';
import { getNpcTypeByWt } from 'src/shared/utils/get-npc-type-by-wt';
import { getProfByShortname } from 'src/shared/utils/get-prof-by-shortname';
import { MIN_SPAWN_OFFSET } from 'src/timers/constants/min-spawn-offset.constant';
import { CreateTimerDto } from 'src/timers/dto/create-timer.dto';
import { ErrorKey } from 'src/timers/enum/error-key.enum';
import { RoutingKey } from 'src/timers/enum/routing-key.enum';
import { omit } from 'lodash';
import { GuildsService } from 'src/guilds/guilds.service';
import { GetTimersDto } from 'src/timers/dto/get-timers.dto';
import { UserLootlogConfigService } from 'src/user-lootlog-config/user-lootlog-config.service';

@Injectable()
export class TimersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly amqpConnection: AmqpConnection,
    private readonly guildsService: GuildsService,
    private readonly userLootlogConfigService: UserLootlogConfigService,
  ) {}

  async createTimer(discordId: string, guildId: string, data: CreateTimerDto) {
    const now = new Date();
    const config =
      await this.userLootlogConfigService.getLootlogCharacterConfig(
        discordId,
        data.accountId,
        data.characterId,
      );

    if (config?.addTimersBlacklistGuildIds?.includes(guildId)) {
      return { message: ErrorKey.BLACKLISTED_GUILD };
    }

    if (data.npc.wt < 19)
      throw new BadRequestException({ message: ErrorKey.WT_TOO_LOW });

    const { minSpawnTime, maxSpawnTime } = this.calculateRespawnTime(
      data.respBaseSeconds,
      data.respawnRandomness,
      now,
    );

    const existingTimer = await this.prisma.timer.findFirst({
      where: {
        guildId,
        world: data.world,
        npcId: data.npc.id,
        maxSpawnTime: { gt: now.toISOString() },
      },
    });

    if (existingTimer) {
      if (
        existingTimer.minSpawnTime.getTime() >=
        now.getTime() + MIN_SPAWN_OFFSET
      ) {
        throw new BadRequestException({ message: ErrorKey.EXISTING_TIMER });
      }

      const updatedTimer = await this.prisma.timer.update({
        where: {
          timerId: {
            guildId,
            world: existingTimer.world,
            npcId: existingTimer.npcId,
          },
        },
        data: {
          minSpawnTime,
          maxSpawnTime,
          member: {
            connect: {
              memberId: {
                userId: discordId,
                guildId,
              },
            },
          },
        },
      });

      this.emitTimer(updatedTimer);

      return updatedTimer;
    }

    const newTimer = await this.prisma.timer.upsert({
      where: {
        timerId: {
          guildId,
          world: data.world,
          npcId: data.npc.id,
        },
      },
      create: {
        maxSpawnTime,
        minSpawnTime,
        world: data.world,
        npcId: data.npc.id,
        guild: {
          connect: {
            id: guildId,
          },
        },
        member: {
          connect: {
            memberId: {
              userId: discordId,
              guildId,
            },
          },
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
        member: {
          connect: {
            memberId: {
              userId: discordId,
              guildId,
            },
          },
        },
      },
    });

    this.emitTimer(newTimer);

    return newTimer;
  }

  async getTimers({ world, guildId }: GetTimersDto) {
    const now = new Date();
    const timers = await this.prisma.timer.findMany({
      where: {
        guildId: guildId,
        maxSpawnTime: { gt: now.toISOString() },
        world,
        // ...(permissions.includes(Permission.LOOTLOG_READ_TIMERS_TITANS)
        //   ? {}
        //   : {
        //       npc: {
        //         type: {
        //           not: NpcType.TITAN,
        //         },
        //       },
        //     }),
      },
      orderBy: {
        maxSpawnTime: 'desc',
      },
      include: {
        member: true,
      },
    });

    return timers;
  }

  async getTimersMerged(discordId: string, { world }: GetTimersDto) {
    const now = new Date();
    const guilds = await this.guildsService.getGuildsForRequiredPermissions(
      discordId,
      [Permission.LOOTLOG_READ],
    );

    const timers = await this.prisma.timer.findMany({
      where: {
        guildId: {
          in: guilds.map((guild) => guild.id),
        },
        maxSpawnTime: { gt: now.toISOString() },
        world,
        // ...(permissions.includes(Permission.LOOTLOG_READ_TIMERS_TITANS)
        //   ? {}
        //   : {
        //       npc: {
        //         type: {
        //           not: NpcType.TITAN,
        //         },
        //       },
        //     }),
      },
      orderBy: {
        maxSpawnTime: 'desc',
      },
      include: {
        member: true,
      },
    });

    const mergedTimers = timers.reduce((acc, timer) => {
      const existing = acc.find((t) => t.npc.id === timer.npcId);

      if (existing) {
        existing.members.push(timer.member);
      } else {
        const newTimer = { ...timer, members: [timer.member] };

        acc.push(omit(newTimer, ['member', 'createdById']));
      }

      return acc;
    }, []);

    return mergedTimers;
  }

  async emitTimer(payload: Timer) {
    this.amqpConnection.publish(
      DEFAULT_EXCHANGE_NAME,
      RoutingKey.GUILDS_TIMERS_UPDATE,
      payload,
    );
  }

  calculateRespawnTime(
    respBaseSeconds: number,
    respawnRandomness: number = 10,
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
