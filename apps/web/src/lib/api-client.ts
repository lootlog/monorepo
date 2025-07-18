import axios from "axios";
import { API_URL } from "@/config/api";

export const apiClient = axios.create({
  baseURL: API_URL,
  withCredentials: true,
});

// Global error interceptor - setupowany tylko raz
let interceptorSetup = false;

export const setupApiInterceptors = (
  toast: (options: {
    title: string;
    description: string;
    variant?: "default" | "destructive";
  }) => void
) => {
  if (interceptorSetup) {
    return; // Już setupowany, nie rób tego ponownie
  }

  apiClient.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.response && error.response.status === 403) {
        console.error("Forbidden access - you do not have permission");
        toast({
          title: "Brak dostępu",
          description: "Nie masz uprawnień do tego lootloga.",
          variant: "destructive",
        });
      }
      return Promise.reject(error);
    }
  );

  interceptorSetup = true;
};
