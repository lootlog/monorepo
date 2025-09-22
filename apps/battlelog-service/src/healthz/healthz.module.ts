import { Module } from '@nestjs/common';
import { HealthzService } from './healthz.service';
import { HealthzController } from './healthz.controller';

@Module({
  providers: [HealthzService],
  controllers: [HealthzController],
})
export class HealthzModule {}
