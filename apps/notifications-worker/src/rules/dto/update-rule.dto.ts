import {
  IsArray,
  IsBoolean,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
} from "class-validator";

export class UpdateRuleDto {
  @IsOptional()
  @IsObject()
  filters?: Record<string, unknown>;

  @IsOptional()
  @IsNumber()
  leadTimeMinutes?: number;

  @IsOptional()
  @IsNumber()
  dedupeWindowSeconds?: number;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsString()
  world?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  targetIds?: string[];
}
