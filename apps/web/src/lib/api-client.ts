import axios from "axios";
import { API_URL } from "@/config/api";

export const apiClient = axios.create({
  baseURL: API_URL,
  withCredentials: true,
});
let interceptorSetup = false;

export const setupApiInterceptors = (
  toast: (options: {
    title: string;
    description: string;
    variant?: "default" | "destructive";
  }) => void
) => {
  if (interceptorSetup) {
    return;
  }

  apiClient.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.response && error.response.status === 403) {
        toast({
          title: "Brak dostępu",
          description: "Nie masz uprawnień do tego lootloga.",
          variant: "destructive",
        });
      }

      if (error.response && error.response.status === 404) {
        toast({
          title: "Nie znaleziono",
          description:
            "Zasób, do którego próbujesz uzyskać dostęp, nie istnieje.",
          variant: "destructive",
        });
      }

      return Promise.reject(error);
    }
  );

  interceptorSetup = true;
};
