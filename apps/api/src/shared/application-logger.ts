export interface ApplicationLogger {
  log(entry: unknown, ...context: unknown[]): void;
  info(entry: unknown, ...context: unknown[]): void;
  warn(entry: unknown, ...context: unknown[]): void;
  error(entry: unknown, ...context: unknown[]): void;
  debug(entry: unknown, ...context: unknown[]): void;
}

export const applicationLogger: ApplicationLogger = {
  log: (entry, ...context) => Effect.runFork(Effect.logInfo(entry, ...context)),
  info: (entry, ...context) =>
    Effect.runFork(Effect.logInfo(entry, ...context)),
  warn: (entry, ...context) =>
    Effect.runFork(Effect.logWarning(entry, ...context)),
  error: (entry, ...context) =>
    Effect.runFork(Effect.logError(entry, ...context)),
  debug: (entry, ...context) =>
    Effect.runFork(Effect.logDebug(entry, ...context)),
};

export class Logger {
  constructor(private readonly context?: string) {}

  debug(message: unknown, ...details: ReadonlyArray<unknown>): void {
    applicationLogger.debug(message, { context: this.context }, ...details);
  }

  error(message: unknown, ...details: ReadonlyArray<unknown>): void {
    applicationLogger.error(message, { context: this.context }, ...details);
  }

  log(message: unknown, ...details: ReadonlyArray<unknown>): void {
    applicationLogger.log(message, { context: this.context }, ...details);
  }

  verbose(message: unknown, ...details: ReadonlyArray<unknown>): void {
    applicationLogger.debug(message, { context: this.context }, ...details);
  }

  warn(message: unknown, ...details: ReadonlyArray<unknown>): void {
    applicationLogger.warn(message, { context: this.context }, ...details);
  }
}
import { Effect } from "effect";
