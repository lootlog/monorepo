import { Exclude, Expose, Type } from "class-transformer";
import { ApiProperty } from "@nestjs/swagger";
import { MemberEntity } from "./member.entity";

export class LootCommentEntity {
  @Expose()
  @ApiProperty({ example: 1, description: "Comment ID" })
  id: number;

  @Expose()
  @ApiProperty({ example: 123, description: "Loot ID" })
  lootId: number;

  @Expose()
  @ApiProperty({
    example: "This is a great drop!",
    description: "Comment content",
  })
  content: string;

  @Expose()
  @Type(() => MemberEntity)
  @ApiProperty({
    type: () => MemberEntity,
    description: "Comment author",
    required: false,
  })
  member?: MemberEntity;

  @Expose()
  @ApiProperty({
    example: "2025-10-13T12:00:00Z",
    description: "Creation timestamp",
  })
  createdAt: Date;

  @Exclude()
  memberId: number;

  @Exclude()
  guildId: string;

  @Exclude()
  updatedAt: Date;
}
