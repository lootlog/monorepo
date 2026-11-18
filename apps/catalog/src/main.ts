import { runService } from "@lootlog/instrumentation/service";
import { RabbitMessaging } from "@lootlog/messaging";
import { Effect } from "effect";
import { CatalogConfig } from "#src/config/catalog-config";
import { CatalogApplication } from "./catalog-application.js";

runService({
  config: CatalogConfig.pipe(Effect.provide(CatalogConfig.layer)),
  application: CatalogApplication,
  supervise: RabbitMessaging.supervised,
});
