import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsArray, ValidateNested, IsInt } from 'class-validator';
import { Type } from 'class-transformer';

class TemplateHeroNpcDto {
  @ApiProperty({ description: 'NPC ID' })
  @IsInt()
  npcId: number;

  @ApiProperty({ description: 'NPC name' })
  @IsString()
  npcName: string;

  @ApiProperty({ description: 'Map names for this hero', type: [String] })
  @IsArray()
  @IsString({ each: true })
  maps: string[];
}

export class CreateTemplateDto {
  @ApiProperty({ description: 'Template name' })
  @IsString()
  name: string;

  @ApiProperty({
    description: 'Hero NPCs with their maps',
    type: [TemplateHeroNpcDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TemplateHeroNpcDto)
  heroNpcs: TemplateHeroNpcDto[];
}
