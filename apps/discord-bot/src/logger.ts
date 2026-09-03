import { runLogEffect } from "@lootlog/instrumentation";
import { Effect } from "effect";

export class AppLogger {
  constructor(private readonly context: string) {}
  log(message: string): void {
    runLogEffect(
      Effect.logInfo(message).pipe(
        Effect.annotateLogs({ context: this.context }),
      ),
    );
  }
  error(message: string): void {
    runLogEffect(
      Effect.logError(message).pipe(
        Effect.annotateLogs({ context: this.context }),
      ),
    );
  }
}
