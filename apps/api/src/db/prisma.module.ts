import { Module } from "@nestjs/common";
import { postgresPoolProvider } from "#src/db/postgres.provider";
import { PrismaService } from "#src/db/prisma.service";

@Module({
  providers: [PrismaService, postgresPoolProvider],
  exports: [PrismaService, postgresPoolProvider],
})
export class PrismaModule {}
