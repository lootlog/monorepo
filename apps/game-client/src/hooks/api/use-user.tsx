import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { useAuthToken } from "../auth/use-auth-token";
import { API_URL } from "@/config/api";

export interface User {
  avatar?: string;
  banner?: string;
  discriminator: string;
  globalName: string;
  id: string;
  username: string;
}

export const useUser = () => {
  const token = useAuthToken();

  const query = useQuery({
    queryKey: ["@me"],
    queryFn: () =>
      axios.get<User>(`${API_URL}/users/@me`, {
        headers: { Authorization: `Bearer ${token}` },
      }),
    enabled: !!token,
    select: (response) => response.data,
  });

  return query;
};
