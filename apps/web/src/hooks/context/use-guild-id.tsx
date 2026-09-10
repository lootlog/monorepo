import { z } from "zod";
import { useParams, useSearch } from "@tanstack/react-router";

const guildSearch = z.object({ guild_id: z.string().optional() });

export const useGuildId = () => {
  const params = useParams({ strict: false });
  const search = guildSearch.parse(useSearch({ strict: false }));

  const guildIdFromPath = "guildId" in params ? params.guildId : undefined;

  return guildIdFromPath ?? search.guild_id;
};
