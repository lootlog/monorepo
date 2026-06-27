import { apiRequest } from "../lib/http.js";

export function runSearch(config) {
  const query = {
    limit: config.search.limit,
    search: config.search.query,
    world: config.search.world,
  };

  apiRequest(config, "search", "health", "GET", "/healthz");
  apiRequest(config, "search", "players", "GET", "/players", { query });
  apiRequest(config, "search", "npcs", "GET", "/npcs", { query });
  apiRequest(config, "search", "items", "GET", "/items", { query });
  apiRequest(config, "search", "all", "GET", "/all", { query });
}
