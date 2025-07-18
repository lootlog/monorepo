import { useToast } from "@/components/ui/use-toast";
import { apiClient, setupApiInterceptors } from "@/lib/api-client";
import { useEffect } from "react";

export const useApiClient = () => {
  const { toast } = useToast();

  useEffect(() => {
    // Setup interceptor tylko raz, globalnie
    setupApiInterceptors(toast);
  }, [toast]);

  return { client: apiClient };
};
