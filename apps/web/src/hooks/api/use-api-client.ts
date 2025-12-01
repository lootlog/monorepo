import { apiClient } from "@/lib/api-client/api-client";

export const useApiClient = () => {
  return { client: apiClient };
};
