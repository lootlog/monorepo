import { Exclude, Expose } from "class-transformer";
import { ApiProperty } from "@nestjs/swagger";

export class GuildEntity {
  @Expose()
  @ApiProperty({ example: "guild_id_123", description: "Discord guild ID" })
  id: string;

  @Expose()
  @ApiProperty({ example: "My Guild", description: "Guild name" })
  name: string;

  @Expose()
  @ApiProperty({
    example: "icon_hash",
    description: "Guild icon hash",
    required: false,
  })
  icon?: string;

  @Expose()
  @ApiProperty({
    example: "my-guild-url",
    description: "Custom vanity URL",
    required: false,
  })
  vanityUrl?: string;

  @Expose()
  ownerId: string;

  @Exclude()
  active: boolean;

  @Exclude()
  createdAt: Date;

  @Exclude()
  updatedAt: Date;
}
