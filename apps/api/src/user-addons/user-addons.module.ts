import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/db/prisma.module';
import { RuntimeEnvironment } from 'src/types/runtime.types';
import { UserAddonsController } from 'src/user-addons/user-addons.controller';
import { UserAddonsService } from 'src/user-addons/user-addons.service';

const isLocalEnvironment =
  (process.env.ENV ?? RuntimeEnvironment.LOCAL) ===
  RuntimeEnvironment.LOCAL;

@Module({
  imports: isLocalEnvironment ? [PrismaModule] : [],
  controllers: isLocalEnvironment ? [UserAddonsController] : [],
  providers: isLocalEnvironment ? [UserAddonsService] : [],
  exports: isLocalEnvironment ? [UserAddonsService] : [],
})
export class UserAddonsModule {}
