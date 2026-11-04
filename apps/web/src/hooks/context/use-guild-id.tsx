import { Schema } from "effect";
import { useParams, useSearch } from "@tanstack/react-router";

const decodeGuildSearch = Schema.decodeUnknownSync(
  Schema.Struct({ guild_id: Schema.optional(Schema.String) }),
);

export const useGuildId = () => {
  const params = useParams({ strict: false });
  const search = decodeGuildSearch(useSearch({ strict: false }));

  const guildIdFromPath = "guildId" in params ? params.guildId : undefined;

  return guildIdFromPath ?? search.guild_id;
};
