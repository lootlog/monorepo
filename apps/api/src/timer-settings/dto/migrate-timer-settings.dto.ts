import { IsString, IsIn, IsObject, IsOptional } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class MigrateTimerSettingsDto {
  @ApiProperty({
    description: "Complete timer settings data from localStorage",
    example: {
      generalConfig: { removeTimerAfterMs: 30000 },
      displayConfig: { showType: true },
    },
    required: true,
  })
  @IsObject()
  localData: Record<string, unknown>;

  @ApiProperty({
    description: "Conflict resolution strategy",
    example: "local",
    required: false,
    enum: ["local", "remote", "merge"],
  })
  @IsOptional()
  @IsString()
  @IsIn(["local", "remote", "merge"])
  conflictResolution?: "local" | "remote" | "merge";
}
