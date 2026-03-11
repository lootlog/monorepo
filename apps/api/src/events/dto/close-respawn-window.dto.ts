import { ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsBoolean,
  IsDateString,
  IsNotEmpty,
  IsOptional,
  ValidateIf,
} from "class-validator";

export class CloseRespawnWindowDto {
  @ApiPropertyOptional({
    description: "Whether to create a new respawn window after closing",
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  createNewWindow?: boolean;

  @ApiPropertyOptional({
    description:
      "Minimum spawn time for the new window (ISO date string). Required when createNewWindow is true.",
  })
  @ValidateIf((o) => o.createNewWindow)
  @IsNotEmpty()
  @IsDateString()
  newMinSpawnTime?: string;

  @ApiPropertyOptional({
    description:
      "Maximum spawn time for the new window (ISO date string). Required when createNewWindow is true.",
  })
  @ValidateIf((o) => o.createNewWindow)
  @IsNotEmpty()
  @IsDateString()
  newMaxSpawnTime?: string;
}
