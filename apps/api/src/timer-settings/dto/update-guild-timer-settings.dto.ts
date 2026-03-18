import { IsOptional, IsArray, IsString } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class UpdateGuildTimerSettingsDto {
  @ApiProperty({
    description: "Array of hidden timer IDs",
    example: ["timer-1", "timer-2"],
    required: false,
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  hiddenTimers?: string[];

  @ApiProperty({
    description: "Array of pinned timer IDs",
    example: ["timer-3", "timer-4"],
    required: false,
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  pinnedTimers?: string[];
}
