export interface AppLogger {
  readonly error: (message: string, context?: unknown) => void;
  readonly warn: (message: string, context?: unknown) => void;
  readonly info: (message: string, context?: unknown) => void;
}

export const effectLogger: AppLogger = {
  error: (message, context) =>
    Effect.runFork(
      Effect.logError(message, context).pipe(
        Effect.annotateLogs({ context: "Search" }),
      ),
    ),
  warn: (message, context) =>
    Effect.runFork(
      Effect.logWarning(message, context).pipe(
        Effect.annotateLogs({ context: "Search" }),
      ),
    ),
  info: (message, context) =>
    Effect.runFork(
      Effect.logInfo(message, context).pipe(
        Effect.annotateLogs({ context: "Search" }),
      ),
    ),
};
import { Effect } from "effect";
