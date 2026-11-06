import { Schema } from "effect";
import { useParams, useSearch } from "@tanstack/react-router";
import { usePendingFirstPathSegment } from "@/lib/router/use-presented-location";

const decodeGuildSearch = Schema.decodeUnknownSync(
  Schema.Struct({ guild_id: Schema.optional(Schema.String) }),
);

export const useGuildId = () => {
  const params = useParams({ strict: false });
  const search = decodeGuildSearch(useSearch({ strict: false }));

  const guildIdFromPath = "guildId" in params ? params.guildId : undefined;

  return guildIdFromPath ?? search.guild_id;
};

/**
 * The Organization the server rail marks: one being opened, at once and
 * before its page has loaded, otherwise the open one.
 */
export const useRailGuildId = () => {
  const openGuildId = useGuildId();
  const openingSegment = usePendingFirstPathSegment();

  return {
    guildId: openingSegment ?? openGuildId,
    isOpening: openingSegment !== undefined && openingSegment !== openGuildId,
  };
};
