import { runLogEffect } from "@lootlog/instrumentation";
import { Effect } from "effect";

export interface ApplicationLogger {
  log(entry: unknown, ...context: unknown[]): void;
  info(entry: unknown, ...context: unknown[]): void;
  warn(entry: unknown, ...context: unknown[]): void;
  error(entry: unknown, ...context: unknown[]): void;
  debug(entry: unknown, ...context: unknown[]): void;
}

export const applicationLogger: ApplicationLogger = {
  log: (entry, ...context) => runLogEffect(Effect.logInfo(entry, ...context)),
  info: (entry, ...context) => runLogEffect(Effect.logInfo(entry, ...context)),
  warn: (entry, ...context) =>
    runLogEffect(Effect.logWarning(entry, ...context)),
  error: (entry, ...context) =>
    runLogEffect(Effect.logError(entry, ...context)),
  debug: (entry, ...context) =>
    runLogEffect(Effect.logDebug(entry, ...context)),
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
