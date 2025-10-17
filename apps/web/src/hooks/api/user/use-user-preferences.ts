import { useQuery } from "@tanstack/react-query";
import { useApiClient } from "@/hooks/api/use-api-client";

export type UserPreferences = {
  id: number;
  userId: string;
  guildsOrder: string[];
  createdAt: string;
  updatedAt: string;
};

export const useUserPreferences = () => {
  const { client } = useApiClient();

  const query = useQuery({
    queryKey: ["user-preferences"],
    queryFn: () => client.get<UserPreferences>("/users/@me/preferences"),
    select: (response) => response.data,
    retry: 1,
  });

  return query;
};
