import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  ArrayNotEmpty,
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
} from "class-validator";

export class CreateWatchedItemDto {
  @ApiProperty()
  @IsInt()
  itemId: number;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  itemName: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  itemIcon?: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  world: string;

  @ApiProperty({ type: [String] })
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  guildIds: string[];
}
