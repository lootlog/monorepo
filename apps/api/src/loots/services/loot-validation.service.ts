import { Injectable } from "@nestjs/common";
import type { CreateLootDto } from "src/loots/dto/create-loot.dto";
import type { LootlogConfigNpc } from "prisma/generated/client";
import { LootMappingService } from "./loot-mapping.service";

@Injectable()
export class LootValidationService {
  constructor(private readonly lootMappingService: LootMappingService) {}

  getLootForGivenConfig(
    loot: CreateLootDto["loots"],
    npcs: LootlogConfigNpc[],
    highestWtNpcType: string,
  ) {
    const targetNpc = npcs.find((npc) => npc.npcType === highestWtNpcType);
    if (!targetNpc) return [];

    return loot
      .map((item) => {
        const { rarity, lvl, type, prof } =
          this.lootMappingService.getItemStats(item);
        if (!targetNpc.allowedRarities.includes(rarity)) return null;

        return {
          id: item.id,
          hid: item.hid,
          name: item.name,
          icon: item.icon,
          stat: item.stat,
          pr: item.pr,
          rarity,
          prc: item.prc,
          type,
          prof,
          lvl,
        };
      })
      .filter(Boolean);
  }
}
