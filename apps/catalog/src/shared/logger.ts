import { ContextLogger } from "@lootlog/instrumentation";

import type { IndexNpcsCommand } from "#src/npcs/index-npcs-command";

type CatalogLogContext =
  | { readonly error: unknown }
  | { readonly npcs: IndexNpcsCommand["npcs"] }
  | { readonly invalidNpcs: IndexNpcsCommand["npcs"] };

export interface AppLogger {
  readonly error: (message: string, context?: CatalogLogContext) => void;
  readonly warn: (message: string, context?: CatalogLogContext) => void;
  readonly info: (message: string, context?: CatalogLogContext) => void;
}

export const effectLogger: AppLogger = new ContextLogger("Catalog");
