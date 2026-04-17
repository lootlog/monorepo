import { useQuery } from "@tanstack/react-query";
import { fetchGuildPermissions } from "@/api";
import type { Permission } from "@lootlog/types";

type UseGuildPermissionsOptions = {
  guildId?: string;
};

export const useGuildPermissions = ({
  guildId,
}: UseGuildPermissionsOptions) => {
  const query = useQuery({
    queryKey: ["guild-permissions", guildId],
    queryFn: () => fetchGuildPermissions(guildId as string),
    enabled: !!guildId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  return query;
};
