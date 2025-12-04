import { Inject, Injectable, type NestMiddleware } from "@nestjs/common";
import type { FastifyRequest, FastifyReply } from "fastify";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import type { Logger } from "winston";

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {}

  use(req: FastifyRequest["raw"], res: FastifyReply["raw"], next: () => void) {
    // @ts-expect-error - FastifyRequest['raw'] doesn't have method and originalUrl in types
    const { method, originalUrl } = req;
    const requestStartTime = new Date().getTime();

    res.on("finish", () => {
      const { statusCode } = res;

      const responseTime = new Date().getTime();
      const duration = responseTime - requestStartTime;
      const message = `${method} ${originalUrl} ${statusCode} ${duration}ms`;

      this.logger.log({
        message,
        level: "info",
      });
    });

    next();
  }
}
