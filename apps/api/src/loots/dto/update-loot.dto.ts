import { IsString } from 'class-validator';

export class UpdateLootDto {
  @IsString()
  msg: string;
}
