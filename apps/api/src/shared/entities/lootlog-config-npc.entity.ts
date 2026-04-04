import { Exclude, Expose } from "class-transformer";
import { ApiProperty } from "@nestjs/swagger";
import { NpcType, ItemRarity } from "src/generated/prisma/client";
import {
  swaggerStringEnum,
  swaggerStringEnumArray,
} from "src/shared/swagger/prisma-enum";

export class LootlogConfigNpcEntity {
  @Expose()
  @ApiProperty({ example: 1, description: "Config NPC ID" })
  id: number;

  @Expose()
  @ApiProperty({
    ...swaggerStringEnum("NpcType", NpcType),
    example: "TITAN",
    description: "NPC type",
  })
  npcType: NpcType;

  @Expose()
  @ApiProperty({
    ...swaggerStringEnumArray("ItemRarity", ItemRarity),
    example: ["UNIQUE", "HEROIC", "LEGENDARY"],
    description: "Allowed item rarities for this NPC type",
  })
  allowedRarities: ItemRarity[];

  @Exclude()
  lootlogConfigId: string;

  @Exclude()
  createdAt: Date;

  @Exclude()
  updatedAt: Date;
}
