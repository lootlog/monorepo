import {
  IsArray,
  IsNumber,
  IsOptional,
  IsString,
} from "class-validator";

export class CreateWatchedItemDto {
  @IsNumber()
  itemId: number;

  @IsString()
  itemName: string;

  @IsOptional()
  @IsString()
  itemIcon?: string;

  @IsOptional()
  @IsString()
  world?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  targetIds?: string[];
}
