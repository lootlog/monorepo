import { ApiProperty } from "@nestjs/swagger";
import { IsInt, IsNotEmpty, IsString, MaxLength } from "class-validator";

export class CreateWatchedItemQuickAddDto {
  @ApiProperty()
  @IsInt()
  itemId: number;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  itemName: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  world: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  guildId: string;
}
