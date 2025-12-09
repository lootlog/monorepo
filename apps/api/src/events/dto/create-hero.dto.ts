import { IsInt, IsString, IsArray, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { HeroMapDto } from './create-event.dto';

export class CreateHeroDto {
  @ApiProperty({ description: 'NPC ID' })
  @IsInt()
  npcId: number;

  @ApiProperty({ description: 'NPC name' })
  @IsString()
  npcName: string;

  @ApiPropertyOptional({
    description: 'Initial maps for this hero',
    type: [HeroMapDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => HeroMapDto)
  maps?: HeroMapDto[];
}
