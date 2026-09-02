import { BunRuntime } from "@effect/platform-bun";
import { Layer } from "effect";
import { FetchHttpClient } from "effect/unstable/http";
import {
  OtlpLogger,
  OtlpSerialization,
  OtlpTracer,
} from "effect/unstable/observability";
import { BotApplication } from "./bot-application.js";

const ObservabilityLive = Layer.merge(
  OtlpTracer.layerFromConfig({ resource: { serviceName: "discord-bot" } }),
  OtlpLogger.layerFromConfig({
    resource: { serviceName: "discord-bot" },
    mergeWithExisting: true,
  }),
).pipe(
  Layer.provide(OtlpSerialization.layerJson),
  Layer.provide(FetchHttpClient.layer),
);

BunRuntime.runMain(
  Layer.launch(BotApplication.pipe(Layer.provide(ObservabilityLive))),
);
