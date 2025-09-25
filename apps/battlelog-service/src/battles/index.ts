// Main service and module exports
export { BattlesService } from './battles.service';
export { BattlesController } from './battles.controller';
export { BattlesModule } from './battles.module';

// DTOs
export { CreateBattleDto } from './dto/create-battle.dto';
export { UpdateBattleDto } from './dto/update-battle.dto';
export { QueryBattlesDto, PaginationStrategy, SortField, SortOrder } from './dto/query-battles.dto';

// Interfaces
export type {
  BattleWithRelations,
  CreateBattleParams,
  CreateBattleResult,
  GetAllBattlesResult,
  DeleteBattleResult,
  RawBattleData,
  IBattlesService,
} from './interfaces/battle-service.interface';

export type { PaginationResult, PaginationOptions } from './interfaces/pagination.interface';

// Battle processor types
export type { BattleAnalysis, Warrior } from './battle-processor';
export { BattleProcessor } from './battle-processor';

// Services
export { PaginationService } from './services/pagination.service';

// Custom errors
export {
  BattleNotFoundError,
  BattleProcessingError,
  R2StorageError,
} from './interfaces/battle-service.interface';