import { Global, Module, forwardRef } from "@nestjs/common";
import { MemberContextService } from "./member-context.service";
import { MembersModule } from "src/members/members.module";
import { PrismaModule } from "src/db/prisma.module";
import { RedisModule } from "src/lib/redis/redis.module";

@Global()
@Module({
  imports: [PrismaModule, RedisModule, forwardRef(() => MembersModule)],
  providers: [MemberContextService],
  exports: [MemberContextService],
})
export class MemberContextModule {}
