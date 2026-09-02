import {
  Global,
  Inject,
  Injectable,
  Module,
  type LoggerService,
} from "@nestjs/common";
import * as winston from "winston";
import { winstonConfig } from "#src/config/winston.config";
import { APPLICATION_LOGGER, APPLICATION_NEST_LOGGER } from "./logger-token.js";

type ApplicationLogger = winston.Logger;
const messageText = (message: unknown): string =>
  typeof message === "string" ? message : JSON.stringify(message);

@Injectable()
class ApplicationNestLogger implements LoggerService {
  constructor(
    @Inject(APPLICATION_LOGGER) private readonly logger: ApplicationLogger,
  ) {}

  log(message: unknown, ...optionalParameters: unknown[]): void {
    this.logger.info(messageText(message), { parameters: optionalParameters });
  }

  error(message: unknown, ...optionalParameters: unknown[]): void {
    this.logger.error(messageText(message), { parameters: optionalParameters });
  }

  warn(message: unknown, ...optionalParameters: unknown[]): void {
    this.logger.warn(messageText(message), { parameters: optionalParameters });
  }

  debug(message: unknown, ...optionalParameters: unknown[]): void {
    this.logger.debug(messageText(message), { parameters: optionalParameters });
  }

  verbose(message: unknown, ...optionalParameters: unknown[]): void {
    this.logger.verbose(messageText(message), {
      parameters: optionalParameters,
    });
  }

  fatal(message: unknown, ...optionalParameters: unknown[]): void {
    this.logger.error(messageText(message), {
      fatal: true,
      parameters: optionalParameters,
    });
  }
}

@Global()
@Module({
  providers: [
    {
      provide: APPLICATION_LOGGER,
      useFactory: () => winston.createLogger(winstonConfig),
    },
    {
      provide: APPLICATION_NEST_LOGGER,
      useClass: ApplicationNestLogger,
    },
  ],
  exports: [APPLICATION_LOGGER, APPLICATION_NEST_LOGGER],
})
export class ApplicationLoggerModule {}
