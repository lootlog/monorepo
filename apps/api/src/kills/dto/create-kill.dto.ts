import { Type } from 'class-transformer';
import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class KillNpcDto {
  @ApiProperty({ example: 12345, description: 'NPC ID (negative for NPCs)' })
  @IsNotEmpty()
  @IsNumber()
  id: number;

  @ApiProperty({ example: 'Boss Name', description: 'NPC name' })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({ example: 100, description: 'NPC level' })
  @IsNotEmpty()
  @IsNumber()
  lvl: number;

  @ApiProperty({ example: 'w', description: 'NPC profession shortname' })
  @IsOptional()
  @IsString()
  prof?: string;

  @ApiProperty({
    example: 85,
    description: 'NPC weight (wt) - used to determine NPC type',
  })
  @IsNotEmpty()
  @IsNumber()
  wt: number;

  @ApiProperty({ example: 'npc_icon.gif', description: 'NPC icon' })
  @IsOptional()
  @IsString()
  icon?: string;

  @ApiProperty({ example: 2, description: 'NPC type (Margonem type)' })
  @IsNotEmpty()
  @IsNumber()
  type: number;
}

export class CreateKillDto {
  @ApiProperty({ example: 'pandora', description: 'World name' })
  @IsNotEmpty()
  @IsString()
  world: string;

  @ApiProperty({ type: KillNpcDto, description: 'NPC data' })
  @IsNotEmpty()
  @ValidateNested()
  @Type(() => KillNpcDto)
  npc: KillNpcDto;

  @ApiProperty({ example: '12345', description: 'Character ID' })
  @IsNotEmpty()
  @IsString()
  characterId: string;

  @ApiProperty({ example: '67890', description: 'Account ID' })
  @IsNotEmpty()
  @IsString()
  accountId: string;

  @ApiProperty({ example: 'PlayerName', description: 'Character name' })
  @IsNotEmpty()
  @IsString()
  characterName: string;

  @ApiProperty({ example: 150, description: 'Character level' })
  @IsNotEmpty()
  @IsNumber()
  characterLvl: number;

  @ApiProperty({ example: 'w', description: 'Character profession shortname' })
  @IsOptional()
  @IsString()
  characterProf?: string;

  @ApiProperty({ example: 'player_icon.gif', description: 'Character icon' })
  @IsOptional()
  @IsString()
  characterIcon?: string;
}
