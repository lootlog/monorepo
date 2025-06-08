import { Injectable } from '@nestjs/common';
import { ItemRarity, NpcType } from 'generated/client';
import { PrismaService } from 'src/db/prisma.service';
import { UpdateLootlogConfigNpcDto } from 'src/lootlog-config/dto/update-lootlog-config-npc.dto';
import { UpdateLootlogConfigDto } from 'src/lootlog-config/dto/update-lootlog-config.dto';

@Injectable()
export class LootlogConfigService {
  constructor(private readonly prisma: PrismaService) {}

  async getLootlogConfig(guildId: string) {
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

    return lootlogConfig;
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
    const data: UpdateLootlogConfigDto = {
      npcs: Object.values(NpcType).map((npcType) => ({
        npcType,
        allowedRarities: Object.values(ItemRarity),
      })),
    };

    const config = this.prisma.lootlogConfig.create({
      data: {
        id: guildId,
        npcs: {
          createMany: {
            data: data.npcs,
          },
        },
      },
      include: {
        npcs: true,
      },
    });

    return config;
  }

  async updateLootlogConfig(guildId: string, { npcs }: UpdateLootlogConfigDto) {
    const config = this.prisma.lootlogConfig.update({
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

    return config;
  }

  async updateNpc(
    guildId: string,
    npcId: string,
    data: UpdateLootlogConfigNpcDto,
  ) {
    const npcConfig = this.prisma.lootlogConfigNpc.update({
      where: {
        lootlogConfigId: guildId,
        id: +npcId,
      },
      data,
    });

    return npcConfig;
  }
}
