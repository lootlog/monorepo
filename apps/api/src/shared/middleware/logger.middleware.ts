import { Inject, Injectable, NestMiddleware } from '@nestjs/common';
import { FastifyRequest, FastifyReply } from 'fastify';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {}

  use(req: FastifyRequest['raw'], res: FastifyReply['raw'], next: () => void) {
    // @ts-ignore
    const { method, originalUrl } = req;
    const requestStartTime = new Date().getTime();

    res.on('finish', () => {
      const { statusCode } = res;

      const responseTime = new Date().getTime();
      const duration = responseTime - requestStartTime;
      const message = `${method} ${originalUrl} ${statusCode} ${duration}ms`;

      this.logger.log({
        message,
        level: 'info',
      });
    });

    next();
  }
}
