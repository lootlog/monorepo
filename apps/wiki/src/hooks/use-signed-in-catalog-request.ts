import { useWikiContext } from "@/contexts/wiki-context";

export const useSignedInCatalogRequest = () => {
  const { config } = useWikiContext();

  return {
    apiClient: {
      baseUrl: config.catalogApiUrl,
      credentials: "include" as const,
    },
  };
};
