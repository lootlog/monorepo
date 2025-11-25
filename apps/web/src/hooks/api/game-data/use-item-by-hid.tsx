import { useQuery } from "@tanstack/react-query";
import { SEARCH_API_URL } from "@/config/api";
import { useApiClient } from "@/hooks/api/use-api-client";
import type { Item } from "./use-items";

export const useItemByHid = (hid: string, enabled: boolean) => {
  const { client } = useApiClient();

  return useQuery({
    queryKey: ["item-by-hid", hid],
    queryFn: async () => {
      const response = await client.get<Item[]>(
        `${SEARCH_API_URL}/items?search=${hid}&limit=1`
      );
      return response.data[0] || null;
    },
    enabled: enabled && hid.length === 64,
    staleTime: 5 * 60 * 1000,
  });
};
