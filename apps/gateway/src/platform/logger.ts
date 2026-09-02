import { Effect } from "effect";

export class Logger {
  constructor(private readonly context: string) {}

  info(message: string, details?: unknown): void {
    Effect.runFork(
      Effect.logInfo(message, details).pipe(
        Effect.annotateLogs({ context: this.context }),
      ),
    );
  }

  warn(message: string, details?: unknown): void {
    Effect.runFork(
      Effect.logWarning(message, details).pipe(
        Effect.annotateLogs({ context: this.context }),
      ),
    );
  }

  error(message: string, details?: unknown): void {
    Effect.runFork(
      Effect.logError(message, details).pipe(
        Effect.annotateLogs({ context: this.context }),
      ),
    );
  }
}
