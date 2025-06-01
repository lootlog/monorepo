import { Module, forwardRef } from '@nestjs/common';
import { MembersEventsHandler } from './members-events.handler';
import { MembersService } from './members.service';
import { GuildsModule } from 'src/guilds/guilds.module';
import { MembersController } from './members.controller';
import { RolesModule } from 'src/roles/roles.module';
import { PrismaService } from 'src/db/prisma.service';

@Module({
  imports: [forwardRef(() => GuildsModule), forwardRef(() => RolesModule)],
  controllers: [MembersController],
  providers: [MembersService, MembersEventsHandler, PrismaService],
  exports: [MembersService],
})
export class MembersModule {}
