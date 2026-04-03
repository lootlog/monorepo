import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsInt, IsNotEmpty, IsOptional, IsString } from "class-validator";

export class CreateWatchedItemQuickAddDto {
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

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  guildId: string;
}
