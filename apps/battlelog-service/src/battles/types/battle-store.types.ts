import type {
  Battle,
  BattleWarrior,
} from "../../shared/drizzle/schema.js";
import type { CreateBattleInput } from "../schemas/create-battle.schema.js";
import type { ParsedMove } from "@lootlog/battle-processor";
import type { PaginationResult } from "./pagination.types.js";

// Complete battle with all relations
export interface BattleWithRelations extends Battle {
  warriors: BattleWarrior[];
}

// Service method parameters
export interface CreateBattleParams {
  data: CreateBattleInput;
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
  rawData: Omit<CreateBattleInput, "events"> & {
    events: ParsedMove[];
  };
}
