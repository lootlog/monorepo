import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
} from "class-validator";

export class CreateRuleDto {
  @IsEnum(["guild", "user"])
  ownerType: "guild" | "user";

  @IsString()
  ownerId: string;

  @IsEnum(["timer_before_spawn", "npc_spawned", "watched_item_dropped"])
  triggerType: "timer_before_spawn" | "npc_spawned" | "watched_item_dropped";

  @IsOptional()
  @IsString()
  guildId?: string;

  @IsOptional()
  @IsString()
  world?: string;

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
  @IsArray()
  @IsString({ each: true })
  targetIds?: string[];
}
