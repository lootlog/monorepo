import { IsNotEmpty, IsString } from 'class-validator';

export class ResetTimerDto {
  @IsNotEmpty()
  @IsString()
  world: string;
}
