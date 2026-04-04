import { ApiProperty } from "@nestjs/swagger";
import {
  IsString,
  IsArray,
  ValidateNested,
  IsInt,
  ArrayMinSize,
} from "class-validator";
import { Type } from "class-transformer";

export class MapItemDto {
  @ApiProperty({ description: "Map ID" })
  @IsInt()
  id: number;

  @ApiProperty({ description: "Map name" })
  @IsString()
  name: string;
}

export class CreateMapTemplateDto {
  @ApiProperty({ description: "Template name" })
  @IsString()
  name: string;

  @ApiProperty({
    description: "List of maps",
    type: [MapItemDto],
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => MapItemDto)
  maps: MapItemDto[];
}
