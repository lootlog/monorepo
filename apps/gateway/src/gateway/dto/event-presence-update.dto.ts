import { IsBoolean, IsNumber, IsOptional, IsString } from "class-validator";

export class EventPresenceUpdateDto {
  @IsOptional()
  @IsNumber()
  mapId?: number;

  @IsOptional()
  @IsString()
  mapName?: string;

  @IsOptional()
  @IsBoolean()
  isAfk?: boolean;
}

export interface PlayerPresenceData {
  mapId?: number;
  mapName?: string;
  isAfk: boolean;
  updatedAt: number;
}
