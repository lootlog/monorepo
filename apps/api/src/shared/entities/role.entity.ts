import { Exclude, Expose } from "class-transformer";
import { ApiProperty } from "@nestjs/swagger";
import { Permission } from "src/generated/prisma/client";
import { swaggerStringEnumArray } from "src/shared/swagger/prisma-enum";

export class RoleEntity {
  @Expose()
  @ApiProperty({ example: "role_id_123", description: "Discord role ID" })
  id: string;

  @Expose()
  @ApiProperty({ example: "guild_id_123", description: "Guild ID" })
  guildId: string;

  @Expose()
  @ApiProperty({ example: "Admin", description: "Role name" })
  name: string;

  @Expose()
  @ApiProperty({
    example: 16711680,
    description: "Role color as decimal",
    required: false,
  })
  color?: number;

  @Expose()
  @ApiProperty({
    example: 5,
    description: "Role position in hierarchy",
    required: false,
  })
  position?: number;

  @Expose()
  @ApiProperty({
    ...swaggerStringEnumArray("Permission", Permission),
    example: ["ADMIN", "LOOTLOG_READ"],
    description: "Array of permissions",
  })
  permissions: Permission[];

  @Expose()
  @ApiProperty({
    example: 0,
    description: "Minimum level requirement",
    required: false,
  })
  lvlRangeFrom?: number;

  @Expose()
  @ApiProperty({
    example: 500,
    description: "Maximum level requirement",
    required: false,
  })
  lvlRangeTo?: number;

  @Exclude()
  createdAt: Date;

  @Exclude()
  updatedAt: Date;
}
