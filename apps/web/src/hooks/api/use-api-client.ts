import { API_URL } from "config/api";
import { useAuthToken } from "hooks/auth/use-auth-token";
import axios from "axios";
import { useSession } from "hooks/auth/use-session";

export const useApiClient = () => {
  const { data: session } = useSession();
  const { data: token } = useAuthToken();

  const client = axios.create({
    baseURL: API_URL,
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return { client: client, isAuthenticated: !!session };
};
