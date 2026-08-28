import { Injectable } from "@nestjs/common";
import { ItemRarity, NpcType } from "src/db/domain";
import { PrismaService } from "src/db/prisma.service";
import type { UpdateLootlogConfigNpcDto } from "src/lootlog-config/dto/update-lootlog-config-npc.dto";
import type { UpdateLootlogConfigDto } from "src/lootlog-config/dto/update-lootlog-config.dto";

@Injectable()
export class LootlogConfigService {
  constructor(private readonly prisma: PrismaService) {}

  getLootlogConfig(guildId: string) {
    return this.prisma.orm.public.LootlogConfig.findUnique({
      where: {
        id: guildId,
      },
      include: {
        npcs: {
          orderBy: {
            id: "desc",
          },
        },
      },
    });
  }

  getMultipleLootlogConfigs(guildIds: string[]) {
    return this.prisma.orm.public.LootlogConfig.findMany({
      where: {
        id: {
          in: guildIds,
        },
      },
      include: {
        npcs: {
          orderBy: {
            id: "desc",
          },
        },
      },
    });
  }

  async createLootlogConfig(guildId: string) {
    const lootlogConfigExists =
      await this.prisma.orm.public.LootlogConfig.findUnique({
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

    return this.prisma.orm.public.LootlogConfig.create({
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
  }

  updateLootlogConfig(guildId: string, { npcs }: UpdateLootlogConfigDto) {
    return this.prisma.orm.public.LootlogConfig.update({
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
  }

  updateNpc(guildId: string, npcId: string, data: UpdateLootlogConfigNpcDto) {
    return this.prisma.orm.public.LootlogConfigNpc.update({
      where: {
        lootlogConfigId: guildId,
        id: +npcId,
      },
      data,
    });
  }
}
