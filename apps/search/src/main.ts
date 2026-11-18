import { runService } from "@lootlog/instrumentation/service";
import { RabbitMessaging } from "@lootlog/messaging";
import { Effect } from "effect";
import { SearchConfig } from "#src/config/search-config";
import { SearchApplication } from "./search-application.js";

runService({
  config: SearchConfig.pipe(Effect.provide(SearchConfig.layer)),
  application: SearchApplication,
  supervise: RabbitMessaging.supervised,
});
