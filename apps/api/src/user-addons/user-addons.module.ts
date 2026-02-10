import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/db/prisma.module';
import { UserAddonsController } from 'src/user-addons/user-addons.controller';
import { UserAddonsService } from 'src/user-addons/user-addons.service';

@Module({
  imports: [PrismaModule],
  controllers: [UserAddonsController],
  providers: [UserAddonsService],
  exports: [UserAddonsService],
})
export class UserAddonsModule {}
