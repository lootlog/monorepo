import type { InflatedBattleWarrior } from "../battle-warrior-stats.js";
import type { Battle } from "#src/shared/modules/drizzle/schema";
import type { CreateBattleDto } from "../dto/create-battle.dto.js";
import type { PaginationResult } from "./pagination.interface.js";
import type { ParsedMove } from "@lootlog/battle-processor";

// Complete battle with all relations
export interface BattleWithRelations extends Battle {
  warriors: InflatedBattleWarrior[];
}

// Service method parameters
export interface CreateBattleParams {
  data: CreateBattleDto;
  userId: string;
}

// Service method return types
export interface CreateBattleResult {
  battleId: string;
}

export interface GetAllBattlesResult {
  battles: BattleWithRelations[];
  pagination: PaginationResult<BattleWithRelations>["pagination"];
  meta: {
    performance: PaginationResult<BattleWithRelations>["performance"];
  };
}

export interface DeleteBattleResult {
  message: string;
}

// Raw battle data structure stored in R2
export interface RawBattleData {
  battleId: string;
  timestamp: string;
  rawData: Omit<CreateBattleDto, "events"> & {
    events: ParsedMove[];
    sourceEvents?: CreateBattleDto["events"];
  };
}
