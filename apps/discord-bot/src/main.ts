import { runService } from "@lootlog/instrumentation/service";
import { RabbitMessaging } from "@lootlog/messaging";
import { Effect } from "effect";
import { BotConfig } from "#src/config/bot-config";
import { BotApplication } from "./bot-application.js";

runService({
  config: BotConfig.pipe(Effect.provide(BotConfig.layer)),
  application: BotApplication,
  supervise: RabbitMessaging.supervised,
});
