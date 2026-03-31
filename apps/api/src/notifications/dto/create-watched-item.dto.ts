import { ApiProperty } from "@nestjs/swagger";
import { IsInt } from "class-validator";

export class CreateWatchedItemDto {
  @ApiProperty()
  @IsInt()
  itemId: number;
}
