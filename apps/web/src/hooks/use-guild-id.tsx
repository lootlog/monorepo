import { useParams, useSearch } from "@tanstack/react-router";

export const useGuildId = () => {
  const params = useParams({ strict: false });
  const search = useSearch({ strict: false }) as { guild_id?: string };

  const guildIdFromPath = "guildId" in params ? params.guildId : undefined;
  const guildIdFromSearchParams = search?.guild_id;

  const guildId = guildIdFromSearchParams ?? guildIdFromPath ?? undefined;

  return guildId;
};
