import { Layer } from "effect";
import { AllHandlers } from "./handlers/all.handlers.js";
import { HealthHandlers } from "./handlers/health.handlers.js";
import { ItemsHandlers } from "./handlers/items.handlers.js";
import { NpcsHandlers } from "./handlers/npcs.handlers.js";
import { PlayersHandlers } from "./handlers/players.handlers.js";

export const SearchHandlers = Layer.mergeAll(
  HealthHandlers,
  PlayersHandlers,
  NpcsHandlers,
  ItemsHandlers,
  AllHandlers,
);
