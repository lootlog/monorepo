import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { HttpModule } from '@nestjs/axios';
import { HealthzController } from './healthz.controller';
import { PrismaService } from 'src/shared/db/prisma.service';

@Module({
  imports: [TerminusModule, HttpModule],
  providers: [PrismaService],
  controllers: [HealthzController],
})
export class HealthzModule {}
