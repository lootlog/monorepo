import { randomUUID } from "node:crypto";
import { Injectable, type NestMiddleware } from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";
import { PerfDiagnosticsService } from "./perf-diagnostics.service";
import { requestDiagnosticsStorage } from "./request-diagnostics-context";

type RawRequest = FastifyRequest["raw"] & {
  method?: string;
  originalUrl?: string;
  url?: string;
};

@Injectable()
export class PerfDiagnosticsMiddleware implements NestMiddleware {
  constructor(
    private readonly perfDiagnosticsService: PerfDiagnosticsService,
  ) {}

  use(req: FastifyRequest["raw"], res: FastifyReply["raw"], next: () => void) {
    if (!this.perfDiagnosticsService.enabled) {
      next();
      return;
    }

    const rawRequest = req as RawRequest;
    const method = rawRequest.method ?? "UNKNOWN";
    const url = rawRequest.originalUrl ?? rawRequest.url ?? "/";
    const requestId = this.getRequestId(rawRequest);
    const startTimeMs = this.perfDiagnosticsService.now();

    requestDiagnosticsStorage.run(
      {
        method,
        requestId,
        sampled: this.perfDiagnosticsService.shouldSampleRequest(),
        startTimeMs,
        url,
      },
      () => {
        res.once("finish", () => {
          this.perfDiagnosticsService.logSpan(
            "request.total",
            this.perfDiagnosticsService.now() - startTimeMs,
            {
              contentLength: res.getHeader("content-length"),
              statusCode: res.statusCode,
            },
          );
        });

        next();
      },
    );
  }

  private getRequestId(req: RawRequest) {
    const header = req.headers["x-request-id"];

    if (Array.isArray(header)) {
      return header[0] ?? randomUUID();
    }

    return header ?? randomUUID();
  }
}
