import { apiClient } from "@/lib/api-client";

export const useApiClient = () => {
  return { client: apiClient };
};
