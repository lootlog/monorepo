// For Hono.js services — middleware-based instrumentation
// Standard HTTP auto-instrumentation doesn't fully support Hono

import { NodeSDK } from "@opentelemetry/sdk-node";
import {
  type BaseObservabilityConfig,
  shouldSkipObservability,
  createObservabilityComponents,
  createHttpServerMetricViews,
  shutdownSdk,
} from "./observability-base.js";

export type HonoObservabilityConfig = BaseObservabilityConfig;

let sdkInstance: NodeSDK | null = null;
let currentServiceName = "";

export function initHonoObservability(config: HonoObservabilityConfig): void {
  const { serviceName } = config;

  if (shouldSkipObservability(config)) return;

  currentServiceName = serviceName;

  const { resource, sampler, spanProcessor, metricReader } =
    createObservabilityComponents(config);

  sdkInstance = new NodeSDK({
    resource,
    sampler,
    spanProcessor,
    metricReader,
    views: createHttpServerMetricViews(),
    instrumentations: [],
  });

  try {
    sdkInstance.start();
    console.log(
      `[${serviceName}] Hono observability initialized (sampling: ${(config.traceSampleRate ?? 0.1) * 100}%).`,
    );
    console.log(
      `[${serviceName}] Remember to add httpInstrumentationMiddleware from @hono/otel!`,
    );
  } catch (error) {
    console.error(
      `[${serviceName}] Observability initialization failed:`,
      error,
    );
    sdkInstance = null;
  }
}

export async function shutdownHonoObservability(): Promise<void> {
  await shutdownSdk(sdkInstance, currentServiceName);
  sdkInstance = null;
}
