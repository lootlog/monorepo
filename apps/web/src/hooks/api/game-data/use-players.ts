import { useQuery } from "@tanstack/react-query";
import { useApiClient } from "hooks/api/use-api-client";
// import { apiClient } from "lib/api-client";

export const usePlayers = () => {
  const { client } = useApiClient();

  const query = useQuery({
    queryKey: ["players"],
    queryFn: () => client.get(`/search/players`),
    select: (response) => response.data,
  });

  return query;
};
