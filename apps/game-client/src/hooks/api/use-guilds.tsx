import { useQuery } from "@tanstack/react-query";
import { fetchGuilds, type Guild } from "@/api";
import { queryKeys } from "@/features/public-api/query-keys";

export type { Guild } from "@/api";

export const getGuildIds = (guilds?: Guild[]) => {
  return guilds?.map((guild) => guild.id) ?? [];
};

export const getGuildNamesById = (guilds?: Guild[]) => {
  return (
    guilds?.reduce<Record<string, string>>((result, guild) => {
      result[guild.id] = guild.name;
      return result;
    }, {}) ?? {}
  );
};

export const useGuilds = () => {
  const query = useQuery({
    queryKey: queryKeys.guilds(),
    queryFn: () => fetchGuilds(),
    refetchOnMount: false,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  return query;
};
