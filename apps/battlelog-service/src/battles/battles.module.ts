import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/shared/modules/prisma/prisma.module';
import { R2Module } from 'src/shared/modules/r2/r2.module';
import { BattlesController, PublicBattlesController } from './battles.controller';
import { BattlesService } from './battles.service';
import { PaginationService } from './services/pagination.service';

@Module({
  imports: [PrismaModule, R2Module],
  controllers: [BattlesController, PublicBattlesController],
  providers: [BattlesService, PaginationService]
})
export class BattlesModule {}
