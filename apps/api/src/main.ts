import { BunRuntime } from "@effect/platform-bun";
import { Layer } from "effect";
import { FetchHttpClient } from "effect/unstable/http";
import {
  OtlpLogger,
  OtlpSerialization,
  OtlpTracer,
} from "effect/unstable/observability";
import { registerNodeWarningDiagnostics } from "#src/shared/diagnostics/node-warning-diagnostics";
import { ApiApplicationLive } from "./http-api/runtime/api-application.js";

registerNodeWarningDiagnostics();

const ObservabilityLive = Layer.merge(
  OtlpTracer.layerFromConfig({ resource: { serviceName: "api" } }),
  OtlpLogger.layerFromConfig({
    resource: { serviceName: "api" },
    mergeWithExisting: true,
  }),
).pipe(
  Layer.provide(OtlpSerialization.layerJson),
  Layer.provide(FetchHttpClient.layer),
);

BunRuntime.runMain(
  Layer.launch(
    ApiApplicationLive.pipe(
      Layer.provide(FetchHttpClient.layer),
      Layer.provide(ObservabilityLive),
    ),
  ),
);
