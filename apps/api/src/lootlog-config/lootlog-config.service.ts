import { Injectable } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { ItemRarity, NpcType } from 'generated/client';
import { PrismaService } from 'src/db/prisma.service';
import { RedisService } from 'src/lib/redis/redis.service';
import type { UpdateLootlogConfigNpcDto } from 'src/lootlog-config/dto/update-lootlog-config-npc.dto';
import type { UpdateLootlogConfigDto } from 'src/lootlog-config/dto/update-lootlog-config.dto';
import { LootlogConfigEntity } from 'src/shared/entities/lootlog-config.entity';
import { LootlogConfigNpcEntity } from 'src/shared/entities/lootlog-config-npc.entity';
import {
  getLootlogConfigCacheKey,
  LOOTLOG_CONFIG_CACHE_TTL_SECONDS,
} from 'src/shared/constants/cache.constant';

@Injectable()
export class LootlogConfigService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
  ) {}

  async getLootlogConfig(guildId: string) {
    const cacheKey = getLootlogConfigCacheKey(guildId);
    const cached = await this.redisService.get(cacheKey);

    if (cached) {
      return JSON.parse(cached);
    }

    const lootlogConfig = await this.prisma.lootlogConfig.findUnique({
      where: {
        id: guildId,
      },
      include: {
        npcs: {
          orderBy: {
            id: 'desc',
          },
        },
      },
    });

    const result = lootlogConfig
      ? plainToInstance(LootlogConfigEntity, lootlogConfig)
      : null;

    if (result) {
      await this.redisService.set(
        cacheKey,
        JSON.stringify(result),
        LOOTLOG_CONFIG_CACHE_TTL_SECONDS,
      );
    }

    return result;
  }

  async getMultipleLootlogConfigs(guildIds: string[]) {
    const lootlogConfigs = await this.prisma.lootlogConfig.findMany({
      where: {
        id: {
          in: guildIds,
        },
      },
      include: {
        npcs: {
          orderBy: {
            id: 'desc',
          },
        },
      },
    });

    return lootlogConfigs;
  }

  async createLootlogConfig(guildId: string) {
    const lootlogConfigExists = await this.prisma.lootlogConfig.findUnique({
      where: {
        id: guildId,
      },
    });

    if (lootlogConfigExists) {
      return;
    }

    const data: UpdateLootlogConfigDto = {
      npcs: Object.values(NpcType).map((npcType) => ({
        npcType,
        allowedRarities: Object.values(ItemRarity),
      })),
    };

    const config = await this.prisma.lootlogConfig.create({
      data: {
        id: guildId,
        npcs: {
          createMany: {
            data: data.npcs,
            skipDuplicates: true,
          },
        },
      },
      include: {
        npcs: true,
      },
    });

    const cacheKey = getLootlogConfigCacheKey(guildId);
    await this.redisService.del(cacheKey);

    return config;
  }

  async updateLootlogConfig(guildId: string, { npcs }: UpdateLootlogConfigDto) {
    const config = await this.prisma.lootlogConfig.update({
      where: {
        id: guildId,
      },
      data: {
        npcs: {
          updateMany: npcs.map((npc) => ({
            where: {
              npcType: npc.npcType,
            },
            data: npc,
          })),
        },
      },
      include: {
        npcs: true,
      },
    });

    const cacheKey = getLootlogConfigCacheKey(guildId);
    await this.redisService.del(cacheKey);

    return config;
  }

  async updateNpc(
    guildId: string,
    npcId: string,
    data: UpdateLootlogConfigNpcDto,
  ) {
    const npcConfig = await this.prisma.lootlogConfigNpc.update({
      where: {
        lootlogConfigId: guildId,
        id: +npcId,
      },
      data,
    });

    const cacheKey = getLootlogConfigCacheKey(guildId);
    await this.redisService.del(cacheKey);

    return plainToInstance(LootlogConfigNpcEntity, npcConfig);
  }
}
