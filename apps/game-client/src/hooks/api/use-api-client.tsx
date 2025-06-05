import { API_URL } from "@/config/api";
import { useAuthToken } from "@/hooks/auth/use-auth-token";
import axios from "axios";

export const useAuthenticatedApiClient = () => {
  const { data: token } = useAuthToken();

  const client = axios.create({
    baseURL: API_URL,
    withCredentials: true,
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return { client, hasToken: !!token };
};

export const useApiClient = () => {
  const client = axios.create({
    baseURL: API_URL,
  });

  return { client };
};
