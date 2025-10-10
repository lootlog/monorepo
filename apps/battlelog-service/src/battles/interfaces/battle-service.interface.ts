import type { Battle, BattleWarrior } from '../../../generated/client';
import type { QueryBattlesDto } from '../dto/query-battles.dto';
import type { UpdateBattleDto } from '../dto/update-battle.dto';
import type { CreateBattleDto } from '../dto/create-battle.dto';
import type { PaginationResult } from './pagination.interface';
import type { BattleAnalysis, ParsedMove } from '../battle-processor';

// Complete battle with all relations
export interface BattleWithRelations extends Battle {
  warriors: BattleWarrior[];
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
  pagination: PaginationResult<BattleWithRelations>['pagination'];
  meta: {
    strategy: PaginationResult<BattleWithRelations>['strategy'];
    performance: PaginationResult<BattleWithRelations>['performance'];
  };
}

export interface DeleteBattleResult {
  message: string;
}

// Raw battle data structure stored in R2
export interface RawBattleData {
  battleId: string;
  timestamp: string;
  rawData: Omit<CreateBattleDto, 'events'> & {
    events: ParsedMove[];
  };
}

// Service interface
export interface IBattlesService {
  /**
   * Creates a new battle, stores it in database and R2
   */
  createBattle(params: CreateBattleParams): Promise<CreateBattleResult>;

  /**
   * Retrieves public battles only with advanced pagination and filtering
   */
  getPublicBattles(query: QueryBattlesDto): Promise<GetAllBattlesResult>;

  /**
   * Retrieves battles for dashboard (public + private for owner)
   */
  getDashboardBattles(
    query: QueryBattlesDto,
    requestingUserId: string,
  ): Promise<GetAllBattlesResult>;

  /**
   * Retrieves a single battle from database with all relations
   */
  getBattleFromDatabase(
    battleId: string,
    requestingUserId?: string,
  ): Promise<BattleWithRelations>;

  /**
   * Retrieves raw battle data from R2 storage
   */
  getBattleRawData(
    battleId: string,
    requestingUserId?: string,
  ): Promise<RawBattleData>;

  /**
   * Updates a battle (only public field)
   */
  updateBattle(
    battleId: string,
    updateData: UpdateBattleDto,
  ): Promise<BattleWithRelations>;

  /**
   * Deletes a battle from both database and R2 storage
   */
  deleteBattle(battleId: string): Promise<DeleteBattleResult>;

  /**
   * Analyzes raw battle data and returns processed statistics
   */
  analyzeBattle(dto: CreateBattleDto): BattleAnalysis;
}

// Error types
export class BattleNotFoundError extends Error {
  constructor(battleId: string) {
    super(`Battle with ID ${battleId} not found`);
    this.name = 'BattleNotFoundError';
  }
}

export class BattleProcessingError extends Error {
  constructor(message: string, cause?: Error) {
    super(message);
    this.name = 'BattleProcessingError';
    this.cause = cause;
  }
}

export class R2StorageError extends Error {
  constructor(message: string, battleId?: string, cause?: Error) {
    super(battleId ? `${message} for battle ${battleId}` : message);
    this.name = 'R2StorageError';
    this.cause = cause;
  }
}
