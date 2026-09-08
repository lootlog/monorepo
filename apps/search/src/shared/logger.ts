import { runLogEffect } from "@lootlog/instrumentation";
import { Effect } from "effect";

import type { IndexNpcsCommand } from "#src/npcs/index-npcs-command";
import type { IndexPlayersCommand } from "#src/players/index-players-command";

type SearchLogContext =
  | { readonly error: unknown }
  | { readonly npcs: IndexNpcsCommand["npcs"] }
  | { readonly invalidNpcs: IndexNpcsCommand["npcs"] }
  | { readonly players: IndexPlayersCommand["players"] }
  | { readonly invalidPlayers: IndexPlayersCommand["players"] };

export interface AppLogger {
  readonly error: (message: string, context?: SearchLogContext) => void;
  readonly warn: (message: string, context?: SearchLogContext) => void;
  readonly info: (message: string, context?: SearchLogContext) => void;
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
