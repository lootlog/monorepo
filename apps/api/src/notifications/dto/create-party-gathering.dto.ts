import {
  ArrayMaxSize,
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";
import { CharacterDto } from "src/notifications/dto/shared-character.dto";

export class CreatePartyGatheringDto {
  @IsArray()
  @IsNotEmpty()
  @IsString({ each: true })
  @ArrayMaxSize(10)
  guildIds: string[];

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  world: string;

  @ValidateNested()
  @Type(() => CharacterDto)
  character: CharacterDto;

  @IsString()
  @IsOptional()
  @MaxLength(200)
  description?: string;

  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(500)
  minLvl?: number;

  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(500)
  maxLvl?: number;
}
