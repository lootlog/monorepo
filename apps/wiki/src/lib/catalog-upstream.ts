import { CATALOG_SERVICE_TOKEN_HEADER } from "@lootlog/protocol/http/catalog-access";

/**
 * The catalog service as the Worker reaches it. The token stays on the
 * server: the browser reads the catalog through the Worker's `/api/catalog`.
 */
export const readCatalogUpstream = () => {
  const baseUrl = process.env.CATALOG_API_URL;
  const token = process.env.CATALOG_SERVICE_TOKEN;

  if (!baseUrl || !token) {
    throw new Error(
      "CATALOG_API_URL and CATALOG_SERVICE_TOKEN must be configured.",
    );
  }

  return { baseUrl, headers: { [CATALOG_SERVICE_TOKEN_HEADER]: token } };
};
