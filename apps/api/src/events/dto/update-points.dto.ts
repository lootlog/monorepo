import { IsInt, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateKillPointDto {
  @ApiProperty({ description: 'New points value for this kill point' })
  @IsInt()
  @Min(0)
  points: number;
}

export class UpdateRankingPointsDto {
  @ApiProperty({ description: 'New total points value for this ranking' })
  @IsInt()
  @Min(0)
  totalPoints: number;
}
