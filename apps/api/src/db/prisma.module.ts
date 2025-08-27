import { Module } from '@nestjs/common';
import { PrismaService } from 'src/db/prisma.service';

@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
