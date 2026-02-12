import { ApiProperty } from '@nestjs/swagger';
import { UserGuildPermissionsDto } from 'src/guilds/dto/user-guild-permissions.dto';

class LootlogGuildStatusDto {
  @ApiProperty({
    description: 'Whether timer tracking is enabled for this guild',
  })
  timersEnabled: boolean;

  @ApiProperty({
    description: 'Whether loot tracking is enabled for this guild',
  })
  lootEnabled: boolean;
}

class InternalLootlogSettingsDto {
  @ApiProperty({ description: 'Account ID used to resolve settings' })
  accountId: string;

  @ApiProperty({ description: 'Character ID used to resolve settings' })
  characterId: string;

  @ApiProperty({
    description: 'Guild status map for active character',
    type: 'object',
    additionalProperties: {
      type: 'object',
      properties: {
        timersEnabled: { type: 'boolean' },
        lootEnabled: { type: 'boolean' },
      },
    },
  })
  guildStatusByGuildId: Record<string, LootlogGuildStatusDto>;
}

export class InternalUserGuildPermissionsResponseDto {
  @ApiProperty({
    description: 'List of user guilds with permissions',
    type: [UserGuildPermissionsDto],
  })
  guilds: UserGuildPermissionsDto[];

  @ApiProperty({
    description:
      'Lootlog settings for active character resolved for this user and account',
    type: InternalLootlogSettingsDto,
    required: false,
  })
  lootlogSettings?: InternalLootlogSettingsDto;
}
