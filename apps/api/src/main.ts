import { runService } from "@lootlog/instrumentation/service";
import { RabbitMessaging } from "@lootlog/messaging";
import { Effect, Layer } from "effect";
import { FetchHttpClient } from "effect/http";
import { registerNodeWarningDiagnostics } from "#src/shared/diagnostics/node-warning-diagnostics";
import { apiConfiguration } from "#src/config/api.config";
import { ApiApplicationLive } from "./runtime/application/api-application.js";

const NodeWarningDiagnosticsLive = Layer.effectDiscard(
  Effect.flatMap(apiConfiguration, (config) =>
    Effect.sync(() => registerNodeWarningDiagnostics(config)),
  ),
);

runService({
  config: apiConfiguration,
  application: ApiApplicationLive.pipe(
    Layer.provide(FetchHttpClient.layer),
    Layer.provide(NodeWarningDiagnosticsLive),
  ),
  supervise: RabbitMessaging.supervised,
});
