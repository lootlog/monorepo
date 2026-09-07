import { Config, Effect, Layer, Logger, Option, Tracer } from "effect";
import { FetchHttpClient, HttpMiddleware } from "effect/unstable/http";
import {
  OtlpMetrics,
  OtlpSerialization,
  OtlpTracer,
} from "effect/unstable/observability";
import { isHealthcheck } from "./instrumentation.js";
import { logSpanContext, makeJsonLogger } from "./logging.js";
import { startRuntimeMetrics } from "./runtime-metrics.js";

const sampledTracer = Layer.effect(
  Tracer.Tracer,
  Effect.gen(function* () {
    const tracer = yield* Effect.tracer;
    return Tracer.make({
      span(options) {
        const sampled = Option.isSome(options.parent)
          ? options.parent.value.sampled
          : Math.random() < 0.1;
        const span = tracer.span({
          ...options,
          sampled: options.sampled && sampled,
        });
        const attribute = span.attribute.bind(span);
        // HTTP credentials can live in arbitrary headers and OAuth query strings.
        span.attribute = (name, value) => {
          if (
            name === "url.full" ||
            name === "url.query" ||
            name.startsWith("http.request.header.") ||
            name.startsWith("http.response.header.")
          )
            return;
          attribute(name, value);
        };
        return span;
      },
      context(primitive, fiber) {
        return logSpanContext.run(fiber.currentSpan, () =>
          primitive["~effect/Effect/evaluate"](fiber),
        );
      },
    });
  }),
);

export const makeObservabilityLayer = <E, R>(
  configuration: Effect.Effect<
    {
      readonly serviceName: string;
      readonly environment: string;
      readonly serviceNamespace: string;
      readonly commitSha?: string | undefined;
    },
    E,
    R
  >,
) =>
  Layer.unwrap(
    Effect.gen(function* () {
      const config = yield* configuration;
      const commitSha =
        config.commitSha ??
        (yield* Config.string("COMMIT_SHA").pipe(
          Config.withDefault(undefined),
        ));
      const instanceId = yield* Config.string("OTEL_SERVICE_INSTANCE_ID").pipe(
        Config.orElse(() => Config.string("HOSTNAME")),
        Config.withDefault(`local-${process.pid}`),
      );
      const resource = {
        serviceName: config.serviceName,
        serviceVersion: commitSha,
        attributes: {
          "deployment.environment": config.environment,
          "deployment.environment.name": config.environment,
          "service.namespace": config.serviceNamespace,
          "service.instance.id": instanceId,
        },
      };
      return Layer.mergeAll(
        OtlpMetrics.layerFromConfig({ resource }),
        sampledTracer.pipe(
          Layer.provideMerge(OtlpTracer.layerFromConfig({ resource })),
        ),
        Layer.effectDiscard(startRuntimeMetrics),
        Layer.succeed(HttpMiddleware.TracerDisabledWhen)((request) =>
          isHealthcheck(request.url),
        ),
      ).pipe(
        Layer.provideMerge(
          Logger.layer([makeJsonLogger({ ...config, commitSha })]),
        ),
      );
    }),
  ).pipe(
    Layer.provide(OtlpSerialization.layerJson),
    Layer.provide(FetchHttpClient.layer),
  );
