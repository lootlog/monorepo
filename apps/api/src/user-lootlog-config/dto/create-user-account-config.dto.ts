import { IsArray, IsString } from 'class-validator';

export class CreateOrUpdateLootlogCharacterConfigDto {
  @IsArray()
  lootGuildIds: string[];

  @IsArray()
  timerGuildIds: string[];

  @IsString()
  characterId: string;
}
