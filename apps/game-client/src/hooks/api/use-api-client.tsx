import { API_URL } from "@/config/api";
import { useAuthToken } from "@/hooks/auth/use-auth-token";
import axios from "axios";

export const useAuthenticatedApiClient = () => {
  const token = useAuthToken();

  const client = axios.create({
    baseURL: API_URL,
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return { client, hasToken: !!token };
};
