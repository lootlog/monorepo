import { ApiProperty } from '@nestjs/swagger';
import { Permission } from 'generated/client';

class UserGuildPermissionsRole {
  @ApiProperty({ description: 'Role ID' })
  id: string;

  @ApiProperty({ description: 'Minimum level for the role' })
  lvlRangeFrom: number;

  @ApiProperty({ description: 'Maximum level for the role' })
  lvlRangeTo: number;

  @ApiProperty({ description: 'Permissions granted by this role', enum: Permission, isArray: true })
  permissions: Permission[];
}

class UserGuildPermissionsGuild {
  @ApiProperty({ description: 'Guild ID' })
  id: string;
}

export class UserGuildPermissionsDto {
  @ApiProperty({ description: 'Guild basic information', type: UserGuildPermissionsGuild })
  guild: UserGuildPermissionsGuild;

  @ApiProperty({ description: 'User roles in the guild with their permissions', type: [UserGuildPermissionsRole] })
  roles: UserGuildPermissionsRole[];
}
