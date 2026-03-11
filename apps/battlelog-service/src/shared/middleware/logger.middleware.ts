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
    const { method, url } = req;
    const requestStartTime = Date.now();

    res.on("finish", () => {
      const { statusCode } = res;
      const duration = Date.now() - requestStartTime;
      const message = `${method} ${url} ${statusCode} ${duration}ms`;

      this.logger.log("info", message);
    });

    next();
  }
}
