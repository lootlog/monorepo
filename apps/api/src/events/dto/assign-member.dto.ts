import { IsInt } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AssignMemberDto {
  @ApiProperty({ description: 'Member ID to assign to the map' })
  @IsInt()
  memberId: number;
}
