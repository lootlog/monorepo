import { IsString, IsOptional, ValidateIf } from "class-validator";
import { ApiPropertyOptional } from "@nestjs/swagger";

export class AssignMapLocationDto {
  @ApiPropertyOptional({
    description: "Location ID (null to remove from location)",
    example: "clxxx123",
  })
  @IsOptional()
  @ValidateIf((o) => o.locationId !== null)
  @IsString()
  locationId?: string | null;
}
