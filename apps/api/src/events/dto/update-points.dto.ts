import { IsNumber, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateKillPointDto {
  @ApiProperty({ description: 'New points value for this kill point' })
  @IsNumber({
    maxDecimalPlaces: 2,
    allowInfinity: false,
    allowNaN: false,
  })
  @Min(0)
  points: number;
}

export class UpdateRankingPointsDto {
  @ApiProperty({ description: 'New total points value for this ranking' })
  @IsNumber({
    maxDecimalPlaces: 2,
    allowInfinity: false,
    allowNaN: false,
  })
  @Min(0)
  totalPoints: number;
}
