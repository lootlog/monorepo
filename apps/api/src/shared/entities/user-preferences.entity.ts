import { Exclude, Expose } from "class-transformer";
import { ApiProperty } from "@nestjs/swagger";

export class UserPreferencesEntity {
  @Expose()
  @ApiProperty({ example: "user_id_123", description: "User ID" })
  userId: string;

  @Expose()
  @ApiProperty({
    example: ["guild_1", "guild_2", "guild_3"],
    description: "Ordered list of guild IDs",
    type: [String],
  })
  guildsOrder: string[];

  @Expose()
  @ApiProperty({
    example: "cyberpunk",
    description: "Theme preference",
    enum: [
      "default",
      "cyberpunk",
      "pastel",
      "fantasy",
      "shonen",
      "onepiece",
      "anime",
      "goth",
      "halloween",
      "realmadrid",
      "realmadrid-3rd",
      "barcelona",
      "waguri",
      "rukia",
      "cat-pink",
      "cat-purple",
      "cat-blue",
      "cat-random",
    ],
  })
  theme: string;

  @Expose()
  @ApiProperty({
    example: "dark",
    description: "Color mode preference",
    enum: ["light", "dark"],
  })
  colorMode: string;

  @Exclude()
  id: number;

  @Exclude()
  createdAt: Date;

  @Exclude()
  updatedAt: Date;
}
