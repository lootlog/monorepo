import { useParams, useSearch } from "@tanstack/react-router";

export const useGuildId = () => {
  const params = useParams({ strict: false });
  const search = useSearch({ strict: false }) as { guild_id?: string };

  const urlParams = new URLSearchParams(window.location.search);
  const rawGuildId = urlParams.get("guild_id");

  const guildIdFromPath = "guildId" in params ? params.guildId : undefined;
  const guildIdFromSearchParams = search?.guild_id;

  const guildId = rawGuildId ?? guildIdFromSearchParams ?? guildIdFromPath;

  return guildId;
};
