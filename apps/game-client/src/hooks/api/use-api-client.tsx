import { API_URL } from "@/config/api";
import axios from "axios";

export const useAuthenticatedApiClient = () => {
  const client = axios.create({
    baseURL: API_URL,
    withCredentials: true,
  });

  return { client };
};

export const useApiClient = () => {
  const client = axios.create({
    baseURL: API_URL,
  });

  return { client };
};
