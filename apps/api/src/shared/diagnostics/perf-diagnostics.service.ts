import { performance } from "node:perf_hooks";
import { Inject, Injectable } from "@nestjs/common";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import type { Logger } from "winston";
import { env } from "src/config/env";
import { getRequestDiagnosticsContext } from "./request-diagnostics-context";

type PerfMetadata = Record<string, unknown>;

@Injectable()
export class PerfDiagnosticsService {
  private readonly podName = process.env.HOSTNAME;

  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {}

  get enabled() {
    return env.PERF_DIAGNOSTICS_ENABLED;
  }

  get thresholdMs() {
    return env.PERF_DIAGNOSTICS_THRESHOLD_MS;
  }

  now() {
    return performance.now();
  }

  shouldSampleRequest() {
    if (!this.enabled) {
      return false;
    }

    return Math.random() < env.PERF_DIAGNOSTICS_SAMPLE_RATE;
  }

  isActiveForCurrentContext() {
    if (!this.enabled) {
      return false;
    }

    const context = getRequestDiagnosticsContext();
    if (context) {
      return context.sampled;
    }

    return Math.random() < env.PERF_DIAGNOSTICS_SAMPLE_RATE;
  }

  logSpan(span: string, durationMs: number, metadata: PerfMetadata = {}) {
    if (
      !this.isActiveForCurrentContext() ||
      durationMs < env.PERF_DIAGNOSTICS_THRESHOLD_MS
    ) {
      return;
    }

    const context = getRequestDiagnosticsContext();
    const payload = {
      event: "api.perf",
      span,
      durationMs: this.round(durationMs),
      thresholdMs: env.PERF_DIAGNOSTICS_THRESHOLD_MS,
      requestId: context?.requestId,
      method: context?.method,
      url: context?.url,
      route: context?.route,
      podName: this.podName,
      ...metadata,
    };

    this.logger.warn({
      level: "warn",
      message: `api.perf ${JSON.stringify(payload)}`,
    });
  }

  async time<T>(
    span: string,
    callback: () => Promise<T>,
    metadata: PerfMetadata = {},
  ) {
    if (!this.isActiveForCurrentContext()) {
      return callback();
    }

    const startedAt = this.now();
    try {
      return await callback();
    } finally {
      this.logSpan(span, this.now() - startedAt, metadata);
    }
  }

  round(value: number) {
    return Math.round(value * 100) / 100;
  }

  roundStages(stages: Record<string, number>) {
    return Object.fromEntries(
      Object.entries(stages).map(([key, value]) => [key, this.round(value)]),
    );
  }
}
