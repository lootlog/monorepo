import { FetchHttpClient } from "effect/http";
import { ApiKeyService } from "#src/auth/api-key-service";
import { runService } from "@lootlog/instrumentation/service";
import { Effect, Layer } from "effect";
import {
  AuthRedisStorage,
  createAuthRedisConnection,
} from "#src/auth/storage/auth-redis-storage";
import { AuthService } from "#src/auth/auth-service";
import { BetterAuthRuntime } from "#src/auth/provider/better-auth";
import { AppConfig } from "#src/config/env";
import { AuthDatabaseLive } from "#src/database/drizzle";
import { AuthHttpServer } from "#src/http/server";

const InfrastructureLive = Layer.merge(
  AuthDatabaseLive,
  AuthRedisStorage.layer,
).pipe(
  Layer.provide(
    Layer.unwrap(
      Effect.map(AppConfig, (config) =>
        createAuthRedisConnection(config.redisUrl),
      ),
    ),
  ),
  Layer.provide(AppConfig.layer),
);

const BetterAuthLive = BetterAuthRuntime.layer.pipe(
  Layer.provide(InfrastructureLive),
  Layer.provide(AppConfig.layer),
);

const ApiKeysLive = ApiKeyService.layer.pipe(
  Layer.provide(FetchHttpClient.layer),
  Layer.provide(BetterAuthLive),
  Layer.provide(InfrastructureLive),
  Layer.provide(AppConfig.layer),
);

const AuthServicesLive = AuthService.layer.pipe(
  Layer.provideMerge(ApiKeysLive),
  Layer.provideMerge(BetterAuthLive),
  Layer.provideMerge(InfrastructureLive),
  Layer.provideMerge(AppConfig.layer),
);

runService({
  config: AppConfig.pipe(Effect.provide(AppConfig.layer)),
  application: AuthHttpServer.pipe(Layer.provide(AuthServicesLive)),
});
