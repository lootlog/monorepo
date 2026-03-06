import {
  IsNotEmpty,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CharacterDto } from 'src/notifications/dto/shared-character.dto';

export class CreateVolunteerDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(50)
  world: string;

  @IsNotEmpty()
  @IsString()
  targetDiscordId: string;

  @ValidateNested()
  @Type(() => CharacterDto)
  character: CharacterDto;
}
