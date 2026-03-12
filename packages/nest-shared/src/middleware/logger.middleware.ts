import { Inject, Injectable, type NestMiddleware } from "@nestjs/common";
import type { FastifyRequest, FastifyReply } from "fastify";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import type { Logger } from "winston";

type FastifyRawRequestLike = FastifyRequest["raw"] & {
  method?: string;
  originalUrl?: string;
  url?: string;
};

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {}

  use(req: FastifyRequest["raw"], res: FastifyReply["raw"], next: () => void) {
    const rawRequest = req as FastifyRawRequestLike;
    const method = rawRequest.method ?? "UNKNOWN";
    const requestUrl = rawRequest.originalUrl ?? rawRequest.url ?? "/";
    const requestStartTime = Date.now();

    res.on("finish", () => {
      const { statusCode } = res;
      const duration = Date.now() - requestStartTime;
      const message = `${method} ${requestUrl} ${statusCode} ${duration}ms`;

      this.logger.log({
        message,
        level: "info",
      });
    });

    next();
  }
}
