import { getApiClient } from "@/lib/api-client";

export const useAuthenticatedApiClient = (
  api: "default" | "battlelog" | "auth" = "default",
) => {
  const client = getApiClient(api);

  return { client };
};

export const useApiClient = () => {
  const client = getApiClient("public");

  return { client };
};
