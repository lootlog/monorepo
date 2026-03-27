import { Expose, Exclude } from "class-transformer";
import { ApiProperty } from "@nestjs/swagger";

export class EventSettingsEntity {
  @Exclude()
  id: number;

  @Expose()
  @ApiProperty({ example: "user_id_123", description: "User ID" })
  userId: string;

  @Expose()
  @ApiProperty({ example: "guild_id_456", description: "Guild ID" })
  guildId: string;

  @Expose()
  @ApiProperty({
    description: "Array of pinned event IDs",
    example: ["event-1", "event-2"],
    type: [String],
  })
  pinnedEvents: string[];

  @Expose()
  @ApiProperty({ description: "Creation timestamp" })
  createdAt: Date;

  @Expose()
  @ApiProperty({ description: "Last update timestamp" })
  updatedAt: Date;
}
