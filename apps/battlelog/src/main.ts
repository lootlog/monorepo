import { runService } from "@lootlog/instrumentation/service";
import { Effect, Layer } from "effect";
import { BattlelogApplication } from "#src/battlelog-application";
import { BattlelogConfig } from "#src/config/env";
import { BattlelogHttpServer } from "#src/http/battlelog-http";

runService({
  config: BattlelogConfig.pipe(Effect.provide(BattlelogConfig.layer)),
  application: BattlelogHttpServer.pipe(
    Layer.provide(BattlelogApplication.layer),
  ),
});
