import {
  IsString,
  IsOptional,
  IsBoolean,
  IsArray,
  ValidateNested,
  IsInt,
  IsDateString,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class HeroMapDto {
  @ApiProperty({ description: 'Margonem map ID' })
  @IsInt()
  mapId: number;

  @ApiProperty({ description: 'Map name' })
  @IsString()
  mapName: string;
}

export class HeroNpcDto {
  @ApiPropertyOptional({ description: 'NPC ID' })
  @IsOptional()
  @IsInt()
  npcId?: number;

  @ApiProperty({ description: 'NPC name' })
  @IsString()
  npcName: string;

  @ApiProperty({ description: 'Maps where the NPC can spawn', type: [HeroMapDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => HeroMapDto)
  maps: HeroMapDto[];
}

export class CreateEventDto {
  @ApiProperty({ description: 'Event name' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'World name' })
  @IsString()
  world: string;

  @ApiPropertyOptional({
    description: 'Whether the event is active',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @ApiPropertyOptional({ description: 'Event start time' })
  @IsOptional()
  @IsDateString()
  startsAt?: string;

  @ApiPropertyOptional({ description: 'Event end time' })
  @IsOptional()
  @IsDateString()
  endsAt?: string;

  @ApiPropertyOptional({
    description: 'Base points awarded per hero kill before multipliers',
    default: 100,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  basePointsPerKill?: number;

  @ApiPropertyOptional({
    description: 'Hero NPCs to track with their spawn maps',
    type: [HeroNpcDto],
    default: [],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => HeroNpcDto)
  heroNpcs?: HeroNpcDto[];
}
