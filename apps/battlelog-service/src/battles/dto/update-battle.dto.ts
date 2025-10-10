import { IsBoolean } from 'class-validator';

export class UpdateBattleDto {
  @IsBoolean()
  public: boolean;
}