import { ApiProperty } from "@nestjs/swagger";
import { Permission } from "src/generated/prisma/client";
import { swaggerStringEnumArray } from "src/shared/swagger/prisma-enum";

export class UserGuildPermissionsRole {
  @ApiProperty({ description: "Role ID" })
  id: string;

  @ApiProperty({ description: "Minimum level for the role" })
  lvlRangeFrom: number;

  @ApiProperty({ description: "Maximum level for the role" })
  lvlRangeTo: number;

  @ApiProperty({
    ...swaggerStringEnumArray("Permission", Permission),
    description: "Permissions granted by this role",
  })
  permissions: Permission[];
}

export class UserGuildPermissionsGuild {
  @ApiProperty({ description: "Guild ID" })
  id: string;

  @ApiProperty({ description: "Guild owner Discord ID" })
  ownerId: string;
}

export class UserGuildPermissionsDto {
  @ApiProperty({
    description: "Guild basic information",
    type: UserGuildPermissionsGuild,
  })
  guild: UserGuildPermissionsGuild;

  @ApiProperty({
    description: "User roles in the guild with their permissions",
    type: [UserGuildPermissionsRole],
  })
  roles: UserGuildPermissionsRole[];
}
