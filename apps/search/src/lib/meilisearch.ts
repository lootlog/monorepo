import { Meilisearch } from "meilisearch";
import { APP_CONFIG } from "../config/app.config.js";

const { host, apiKey } = APP_CONFIG.meilisearch;

const meilisearchClient = new Meilisearch({
  host,
  apiKey,
});

export { meilisearchClient };
