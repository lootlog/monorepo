import { IsOptional, IsArray, IsString } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class UpdateEventSettingsDto {
  @ApiProperty({
    description: "Array of pinned event IDs",
    example: ["event-1", "event-2"],
    required: false,
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  pinnedEvents?: string[];
}
