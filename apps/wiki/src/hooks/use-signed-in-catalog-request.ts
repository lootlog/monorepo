import { useWikiContext } from "@/contexts/wiki-context";

/**
 * Request options for a catalog call made as the signed-in User. The Worker's
 * `/api/catalog` reads with its own token, which is nobody's, so these calls
 * go to the catalog itself with the shared auth cookie.
 */
export const useSignedInCatalogRequest = () => {
  const { config } = useWikiContext();

  return {
    apiClient: {
      baseUrl: config.catalogApiUrl,
      credentials: "include" as const,
    },
  };
};
