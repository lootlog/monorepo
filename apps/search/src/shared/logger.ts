import { ContextLogger } from "@lootlog/instrumentation";

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

export const effectLogger: AppLogger = new ContextLogger("Search");
