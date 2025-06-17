import { IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class ResetTimerDto {
  @IsNotEmpty()
  @IsString()
  world: string;

  @IsNotEmpty()
  @IsNumber()
  npcId: number;

  @IsNotEmpty()
  @IsString()
  characterId: string;

  @IsNotEmpty()
  @IsString()
  accountId: string;
}
