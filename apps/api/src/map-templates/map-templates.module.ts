import { Module } from '@nestjs/common';
import { MapTemplatesController } from './map-templates.controller';
import { PrismaModule } from 'src/db/prisma.module';
import { MapTemplatesService } from './map-templates.service';
import { GuildsModule } from 'src/guilds/guilds.module';

@Module({
  imports: [PrismaModule, GuildsModule],
  providers: [MapTemplatesService],
  controllers: [MapTemplatesController],
  exports: [MapTemplatesService],
})
export class MapTemplatesModule {}
