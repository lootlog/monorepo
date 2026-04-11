import { useParams, useSearch } from "@tanstack/react-router";

export const useGuildId = () => {
  const params = useParams({ strict: false });
  const search = useSearch({ strict: false }) as { guild_id?: string };

  const guildIdFromPath = "guildId" in params ? params.guildId : undefined;
  return guildIdFromPath ?? search.guild_id;
};
