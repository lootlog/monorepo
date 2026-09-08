import { runLogEffect } from "@lootlog/instrumentation";
import { Effect } from "effect";

export class Logger {
  constructor(private readonly context: string) {}

  info(message: string, cause?: unknown): void {
    runLogEffect(
      Effect.logInfo(message, cause).pipe(
        Effect.annotateLogs({ context: this.context }),
      ),
    );
  }

  warn(message: string, cause?: unknown): void {
    runLogEffect(
      Effect.logWarning(message, cause).pipe(
        Effect.annotateLogs({ context: this.context }),
      ),
    );
  }

  error(message: string, cause?: unknown): void {
    runLogEffect(
      Effect.logError(message, cause).pipe(
        Effect.annotateLogs({ context: this.context }),
      ),
    );
  }
}
