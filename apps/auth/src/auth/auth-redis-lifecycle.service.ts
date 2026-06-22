import { Injectable, type OnModuleDestroy } from "@nestjs/common";
import { disconnectAuthRedisClient } from "./auth-redis-storage";

@Injectable()
export class AuthRedisLifecycleService implements OnModuleDestroy {
  onModuleDestroy() {
    disconnectAuthRedisClient();
  }
}
