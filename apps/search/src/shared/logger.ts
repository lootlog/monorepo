import { runLogEffect } from "@lootlog/instrumentation";
import { Effect } from "effect";

export interface AppLogger {
  readonly error: (message: string, context?: unknown) => void;
  readonly warn: (message: string, context?: unknown) => void;
  readonly info: (message: string, context?: unknown) => void;
}

export const effectLogger: AppLogger = {
  error: (message, context) =>
    runLogEffect(
      Effect.logError(message, context).pipe(
        Effect.annotateLogs({ context: "Search" }),
      ),
    ),
  warn: (message, context) =>
    runLogEffect(
      Effect.logWarning(message, context).pipe(
        Effect.annotateLogs({ context: "Search" }),
      ),
    ),
  info: (message, context) =>
    runLogEffect(
      Effect.logInfo(message, context).pipe(
        Effect.annotateLogs({ context: "Search" }),
      ),
    ),
};
