import "dotenv/config";
import { BunRuntime } from "@effect/platform-bun";
import { Layer } from "effect";
import { FetchHttpClient } from "effect/unstable/http";
import {
  OtlpLogger,
  OtlpSerialization,
  OtlpTracer,
} from "effect/unstable/observability";
import { SearchApplication } from "./search-application.js";

const ObservabilityLive = Layer.merge(
  OtlpTracer.layerFromConfig({ resource: { serviceName: "search" } }),
  OtlpLogger.layerFromConfig({
    resource: { serviceName: "search" },
    mergeWithExisting: true,
  }),
).pipe(
  Layer.provide(OtlpSerialization.layerJson),
  Layer.provide(FetchHttpClient.layer),
);

BunRuntime.runMain(
  Layer.launch(SearchApplication.pipe(Layer.provide(ObservabilityLive))),
);
