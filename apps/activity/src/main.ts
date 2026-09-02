import "dotenv/config";
import { BunRuntime } from "@effect/platform-bun";
import { Layer } from "effect";
import { FetchHttpClient } from "effect/unstable/http";
import {
  OtlpLogger,
  OtlpSerialization,
  OtlpTracer,
} from "effect/unstable/observability";
import { ActivityApplication } from "./activity-application.js";

const ObservabilityLive = Layer.merge(
  OtlpTracer.layerFromConfig({ resource: { serviceName: "activity" } }),
  OtlpLogger.layerFromConfig({
    resource: { serviceName: "activity" },
    mergeWithExisting: true,
  }),
).pipe(
  Layer.provide(OtlpSerialization.layerJson),
  Layer.provide(FetchHttpClient.layer),
);
BunRuntime.runMain(
  Layer.launch(
    ActivityApplication.pipe(
      Layer.provide(FetchHttpClient.layer),
      Layer.provide(ObservabilityLive),
    ),
  ),
);
