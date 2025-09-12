import { apiClient, setupApiInterceptors } from "@/lib/api-client/api-client";
import { useEffect } from "react";

export const useApiClient = () => {
  useEffect(() => {
    setupApiInterceptors();
  }, []);

  return { client: apiClient };
};
