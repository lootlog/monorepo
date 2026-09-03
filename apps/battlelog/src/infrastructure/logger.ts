import { runLogEffect } from "@lootlog/instrumentation";
import { Effect } from "effect";

export class Logger {
  constructor(private readonly context: string) {}

  debug(message: string, ...details: unknown[]): void {
    runLogEffect(
      Effect.logDebug(message, ...details).pipe(
        Effect.annotateLogs({ context: this.context }),
      ),
    );
  }

  log(message: string, ...details: unknown[]): void {
    runLogEffect(
      Effect.logInfo(message, ...details).pipe(
        Effect.annotateLogs({ context: this.context }),
      ),
    );
  }

  warn(message: string, ...details: unknown[]): void {
    runLogEffect(
      Effect.logWarning(message, ...details).pipe(
        Effect.annotateLogs({ context: this.context }),
      ),
    );
  }

  error(message: string, ...details: unknown[]): void {
    runLogEffect(
      Effect.logError(message, ...details).pipe(
        Effect.annotateLogs({ context: this.context }),
      ),
    );
  }
}
