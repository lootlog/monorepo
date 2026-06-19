import type { QueryClient } from "@tanstack/react-query";
import { useMatches } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { getGuildsControllerGetGuildByIdQueryKey } from "@/lib/api/generated/main/guilds/guilds";
import { resolveDocumentTitle } from "@/lib/router/document-title";

type DocumentTitleUpdaterProps = {
  queryClient: QueryClient;
};

type CachedGuild = {
  name?: string;
};

function getGuildIdFromMatches(
  matches: ReturnType<typeof useMatches>,
): string | undefined {
  for (let index = matches.length - 1; index >= 0; index -= 1) {
    const match = matches[index];
    const guildId = match?.params.guildId;

    if (typeof guildId === "string") {
      return guildId;
    }
  }
}

export function DocumentTitleUpdater({
  queryClient,
}: DocumentTitleUpdaterProps) {
  const matches = useMatches();
  const guildId = getGuildIdFromMatches(matches);
  const guildQueryKey = guildId
    ? getGuildsControllerGetGuildByIdQueryKey({ guildId })
    : undefined;
  const guildQueryKeyHash = guildQueryKey ? JSON.stringify(guildQueryKey) : "";
  const [, setCacheVersion] = useState(0);
  const cachedGuildName = guildQueryKey
    ? queryClient.getQueryData<CachedGuild>(guildQueryKey)?.name
    : undefined;
  const title = resolveDocumentTitle(matches, { guildName: cachedGuildName });

  useEffect(() => {
    if (!guildQueryKeyHash) {
      return undefined;
    }

    return queryClient.getQueryCache().subscribe((event) => {
      if (JSON.stringify(event.query.queryKey) !== guildQueryKeyHash) {
        return;
      }

      setCacheVersion((version) => version + 1);
    });
  }, [guildQueryKeyHash, queryClient]);

  useEffect(() => {
    document.title = title;
  }, [title]);

  return null;
}
