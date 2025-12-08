import { IsInt, IsString, IsArray, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateHeroDto {
  @ApiProperty({ description: 'NPC ID' })
  @IsInt()
  npcId: number;

  @ApiProperty({ description: 'NPC name' })
  @IsString()
  npcName: string;

  @ApiPropertyOptional({
    description: 'Initial maps for this hero',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  maps?: string[];
}
