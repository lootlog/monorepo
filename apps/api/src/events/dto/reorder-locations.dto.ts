import { IsArray, IsString } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class ReorderLocationsDto {
  @ApiProperty({
    description: "Array of location IDs in desired order",
    example: ["clxxx1", "clxxx2", "clxxx3"],
  })
  @IsArray()
  @IsString({ each: true })
  locationIds: string[];
}
