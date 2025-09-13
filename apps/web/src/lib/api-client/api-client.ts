import axios from "axios";
import { API_URL } from "@/config/api";
import { toast } from "sonner";

export const apiClient = axios.create({
  baseURL: API_URL,
  withCredentials: true,
});
let interceptorSetup = false;

export const setupApiInterceptors = () => {
  if (interceptorSetup) {
    return;
  }

  apiClient.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.response && error.response.status === 403) {
        toast.error("Brak dostępu");
      }

      if (error.response && error.response.status === 404) {
        toast.error("Nie znaleziono");
      }

      throw error;
    }
  );

  interceptorSetup = true;
};
