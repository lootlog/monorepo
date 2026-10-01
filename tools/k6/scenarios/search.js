import { apiRequest } from "../lib/http.js";

export function runSearch(config) {
  const query = {
    limit: config.search.limit,
    search: config.search.query,
  };

  // Players are per world; NPCs and items are shared by every world of an
  // edition.
  const worldQuery = { ...query, world: config.search.world };

  apiRequest(config, "search", "health", "GET", "/healthz");
  apiRequest(config, "search", "players", "GET", "/players", {
    query: worldQuery,
  });
  apiRequest(config, "search", "npcs", "GET", "/npcs", { query });
  apiRequest(config, "search", "items", "GET", "/items", { query });
  apiRequest(config, "search", "all", "GET", "/all", { query: worldQuery });
}
