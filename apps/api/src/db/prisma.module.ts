import { Module } from "@nestjs/common";
import { PrismaService } from "#src/db/prisma.service";
import {
  PrismaLifecycle,
  postgresPoolProvider,
  prismaProvider,
} from "#src/db/prisma.provider";

@Module({
  providers: [
    PrismaService,
    prismaProvider,
    postgresPoolProvider,
    PrismaLifecycle,
  ],
  exports: [PrismaService, prismaProvider, postgresPoolProvider],
})
export class PrismaModule {}
