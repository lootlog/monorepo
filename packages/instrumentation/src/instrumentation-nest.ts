// CRITICAL: This file MUST be imported/required BEFORE any other imports in your app!
// Use: node --import ./instrumentation.js ./dist/main.js

import { type Context } from "@opentelemetry/api";
import { NodeSDK } from "@opentelemetry/sdk-node";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { NestInstrumentation } from "@opentelemetry/instrumentation-nestjs-core";
import { envDetector } from "@opentelemetry/resources";
import {
  AggregationType,
  InstrumentType,
  createAllowListAttributesProcessor,
  type ViewOptions,
} from "@opentelemetry/sdk-metrics";
import {
  type ReadableSpan,
  type Span,
  type SpanProcessor,
} from "@opentelemetry/sdk-trace-base";
import {
  type BaseObservabilityConfig,
  shouldSkipObservability,
  createObservabilityComponents,
  createHttpServerMetricViews,
  shutdownSdk,
} from "./observability-base.js";

export interface ObservabilityConfig extends BaseObservabilityConfig {
  enableHostMetrics?: boolean;
  enableProcessMetrics?: boolean;
}

let sdkInstance: NodeSDK | null = null;
let currentServiceName = "";

class FilteringSpanProcessor implements SpanProcessor {
  constructor(private readonly wrappedProcessor: SpanProcessor) {}

  onStart(span: Span, parentContext: Context): void {
    this.wrappedProcessor.onStart(span, parentContext);
  }

  onEnd(span: ReadableSpan): void {
    if (this.shouldDropSpan(span)) {
      return;
    }
    this.wrappedProcessor.onEnd(span);
  }

  private shouldDropSpan(span: ReadableSpan): boolean {
    const spanName = span.name;
    const attributes = span.attributes;

    if (
      spanName.includes("socket.io") ||
      spanName.match(/room:[a-zA-Z]+-?\d+/) ||
      spanName.match(/namespace:[a-zA-Z]+-?\d+/) ||
      spanName.includes("emit to") ||
      spanName.includes("send to")
    ) {
      return true;
    }

    const messagingDest = attributes["messaging.destination"]?.toString();
    if (
      messagingDest &&
      (messagingDest.match(/[a-zA-Z]+:\d+/) ||
        messagingDest.includes("guild:") ||
        messagingDest.includes("battle:"))
    ) {
      return true;
    }

    if (spanName.match(/[a-zA-Z]+:\d+/)) {
      return true;
    }

    return false;
  }

  shutdown(): Promise<void> {
    return this.wrappedProcessor.shutdown();
  }

  forceFlush(): Promise<void> {
    return this.wrappedProcessor.forceFlush();
  }
}

function normalizePath(path: string | undefined | null): string {
  const normalized = (path ?? "/").split("?")[0] || "/";

  if (normalized === "/guilds/@me") return normalized;
  if (normalized === "/healthz") return normalized;

  const prefixes = [
    "/guilds/",
    "/loots/",
    "/users/",
    "/timers/",
    "/internal/guilds/",
    "/battles/",
    "/battles/public/",
  ];

  for (const prefix of prefixes) {
    if (normalized.startsWith(prefix)) {
      const rest = normalized.slice(prefix.length);
      const segments = rest.split("/");

      const knownSubResources = [
        "timers",
        "members",
        "chat-messages",
        "permissions",
        "worlds",
        "lootlog-config",
        "accounts",
        "user-permissions",
        "raw",
      ];

      for (let i = 0; i < segments.length; i++) {
        if (
          segments[i] &&
          !knownSubResources.includes(segments[i] as string) &&
          segments[i] !== "@me"
        ) {
          segments[i] = ":id";
        }
      }

      return prefix + segments.join("/");
    }
  }

  return normalized
    .replace(
      /\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi,
      "/:id",
    )
    .replace(/\/[0-9]+/g, "/:id");
}

function createNestMetricViews(): ViewOptions[] {
  return [
    ...createHttpServerMetricViews(),
    {
      instrumentName: "http.server.request.size",
      attributesProcessors: [
        createAllowListAttributesProcessor(["http.method", "http.route"]),
      ],
      aggregation: { type: AggregationType.EXPLICIT_BUCKET_HISTOGRAM },
    },
    {
      instrumentName: "http.server.response.size",
      attributesProcessors: [
        createAllowListAttributesProcessor(["http.method", "http.route"]),
      ],
      aggregation: { type: AggregationType.EXPLICIT_BUCKET_HISTOGRAM },
    },
    {
      instrumentName: "process.*",
      attributesProcessors: [createAllowListAttributesProcessor([])],
    },
    {
      instrumentName: "system.cpu.*",
      attributesProcessors: [createAllowListAttributesProcessor(["state"])],
    },
    {
      instrumentName: "system.memory.*",
      attributesProcessors: [createAllowListAttributesProcessor(["state"])],
    },
    {
      instrumentName: "system.network.*",
      attributesProcessors: [createAllowListAttributesProcessor(["direction"])],
    },
    {
      instrumentName: "system.disk.*",
      attributesProcessors: [createAllowListAttributesProcessor(["direction"])],
    },
    {
      instrumentName: "system.filesystem.*",
      attributesProcessors: [createAllowListAttributesProcessor(["state"])],
    },
    {
      instrumentType: InstrumentType.HISTOGRAM,
      instrumentName: "*",
      attributesProcessors: [
        createAllowListAttributesProcessor([
          "http.method",
          "http.route",
          "http.status_code",
          "rpc.method",
          "rpc.service",
        ]),
      ],
    },
  ];
}

export function initObservability(config: ObservabilityConfig): void {
  const { serviceName, enableHostMetrics = false } = config;

  if (shouldSkipObservability(config)) return;

  currentServiceName = serviceName;

  const { resource, sampler, spanProcessor, metricReader } =
    createObservabilityComponents(
      config,
      (batchProcessor) => new FilteringSpanProcessor(batchProcessor),
    );

  const instrumentations = getNodeAutoInstrumentations({
    "@opentelemetry/instrumentation-http": {
      enabled: true,
      ignoreOutgoingRequestHook: () => true,
      requestHook: (span: any, req: any) => {
        try {
          const url: string =
            req?.url ?? req?.path ?? req?.raw?.url ?? req?.originalUrl ?? "/";
          const path = normalizePath(url);
          const method: string = req?.method ?? req?.raw?.method ?? "HTTP";

          span.updateName(`${method} ${path}`);
          span.setAttribute("http.route", path);
        } catch {
          // ignore hook errors
        }
      },
    },
    "@opentelemetry/instrumentation-express": { enabled: true },
    "@opentelemetry/instrumentation-fastify": { enabled: true },
    "@opentelemetry/instrumentation-dns": { enabled: false },
    "@opentelemetry/instrumentation-net": { enabled: false },
    "@opentelemetry/instrumentation-fs": { enabled: false },
    "@opentelemetry/instrumentation-pg": { enabled: false },
    "@opentelemetry/instrumentation-mysql": { enabled: false },
    "@opentelemetry/instrumentation-mysql2": { enabled: false },
    "@opentelemetry/instrumentation-redis": { enabled: false },
    "@opentelemetry/instrumentation-ioredis": { enabled: false },
    "@opentelemetry/instrumentation-mongodb": { enabled: false },
    "@opentelemetry/instrumentation-grpc": { enabled: false },
    "@opentelemetry/instrumentation-graphql": { enabled: false },
    "@opentelemetry/instrumentation-aws-sdk": { enabled: false },
    "@opentelemetry/instrumentation-socket.io": { enabled: false },
    "@opentelemetry/instrumentation-amqplib": { enabled: false },
  });

  const nestInstrumentation = new NestInstrumentation();

  sdkInstance = new NodeSDK({
    resource,
    resourceDetectors: [envDetector],
    sampler,
    spanProcessor,
    metricReader,
    views: createNestMetricViews(),
    instrumentations: [instrumentations, nestInstrumentation],
  });

  try {
    sdkInstance.start();

    if (enableHostMetrics) {
      console.warn(
        `[${serviceName}] HostMetrics enabled - watch for cardinality issues!`,
      );
      import("@opentelemetry/host-metrics").then(({ HostMetrics }) => {
        const hostMetrics = new HostMetrics({
          name: `${serviceName}-runtime`,
        });
        hostMetrics.start();
      });
    }

    console.log(
      `[${serviceName}] Observability initialized (sampling: ${
        (config.traceSampleRate ?? 0.1) * 100
      }%, HTTP client disabled, cardinality-controlled metrics).`,
    );
  } catch (error: unknown) {
    console.error(
      `[${serviceName}] Observability initialization failed:`,
      error,
    );
    sdkInstance = null;
  }
}

export async function shutdownObservability(): Promise<void> {
  await shutdownSdk(sdkInstance, currentServiceName);
  sdkInstance = null;
}
