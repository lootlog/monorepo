import { Effect } from "effect";

export class AppLogger {
  constructor(private readonly context: string) {}
  log(message: string): void {
    Effect.runFork(
      Effect.logInfo(message).pipe(
        Effect.annotateLogs({ context: this.context }),
      ),
    );
  }
  error(message: string): void {
    Effect.runFork(
      Effect.logError(message).pipe(
        Effect.annotateLogs({ context: this.context }),
      ),
    );
  }
}
