import { Global, Module, forwardRef } from "@nestjs/common";
import { MemberContextService } from "./member-context.service.js";
import { MemberContextRepository } from "./member-context.repository.js";
import { MembersModule } from "#src/members/members.module";
import { RedisModule } from "#src/lib/redis/redis.module";

@Global()
@Module({
  imports: [RedisModule, forwardRef(() => MembersModule)],
  providers: [MemberContextRepository, MemberContextService],
  exports: [MemberContextService],
})
export class MemberContextModule {}
