import { Exclude, Expose, Type } from "class-transformer";
import { ApiProperty } from "@nestjs/swagger";
import { LootlogConfigNpcEntity } from "./lootlog-config-npc.entity";

export class LootlogConfigEntity {
  @Expose()
  @ApiProperty({
    example: "guild_id_123",
    description: "Guild ID (same as config ID)",
  })
  id: string;

  @Expose()
  @Type(() => LootlogConfigNpcEntity)
  @ApiProperty({
    type: [LootlogConfigNpcEntity],
    description: "NPC configurations",
  })
  npcs: LootlogConfigNpcEntity[];

  @Exclude()
  createdAt: Date;

  @Exclude()
  updatedAt: Date;
}
