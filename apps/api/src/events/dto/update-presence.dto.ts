import { IsBoolean, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdatePresenceDto {
  @ApiProperty({ description: 'Current map name' })
  @IsString()
  mapName: string;

  @ApiProperty({ description: 'Whether the player is AFK (h.stasis)' })
  @IsBoolean()
  isAfk: boolean;
}
