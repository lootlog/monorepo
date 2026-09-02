import { Effect } from "effect";

export class Logger {
  constructor(private readonly context: string) {}

  info(message: string, details?: unknown): void {
    Effect.runSync(
      Effect.logInfo(message, details).pipe(
        Effect.annotateLogs({ context: this.context }),
      ),
    );
  }

  warn(message: string, details?: unknown): void {
    Effect.runSync(
      Effect.logWarning(message, details).pipe(
        Effect.annotateLogs({ context: this.context }),
      ),
    );
  }

  error(message: string, details?: unknown): void {
    Effect.runSync(
      Effect.logError(message, details).pipe(
        Effect.annotateLogs({ context: this.context }),
      ),
    );
  }
}
