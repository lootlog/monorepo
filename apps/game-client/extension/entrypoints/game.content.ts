import { gameMatches, excludedGameMatches } from "../matches";
import { defineContentScript } from "wxt/utils/define-content-script";
import { startGameEntrypoint } from "@/extension/game-entrypoint";

export default defineContentScript({
  matches: gameMatches,
  excludeMatches: excludedGameMatches,
  world: "MAIN",
  runAt: "document_end",
  main: startGameEntrypoint,
});
