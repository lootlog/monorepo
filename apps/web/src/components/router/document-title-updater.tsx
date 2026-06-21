import type { QueryCacheNotifyEvent, QueryClient } from "@tanstack/react-query";
import { useMatches } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import type { Battle } from "@/lib/api/battlelog-types";
import { getBattlesControllerGetBattleQueryKey } from "@/lib/api/generated/battlelog/battles/battles";
import { getGuildsControllerGetGuildByIdQueryKey } from "@/lib/api/generated/main/guilds/guilds";
import { resolveDocumentTitle } from "@/lib/router/document-title";

type DocumentTitleUpdaterProps = {
  queryClient: QueryClient;
};

type CachedGuild = {
  name?: string;
};

export function shouldRefreshDocumentTitleFromQueryCacheEvent(
  event: QueryCacheNotifyEvent,
  queryKeyHash: string,
) {
  if (!queryKeyHash || event.type !== "updated") {
    return false;
  }

  return JSON.stringify(event.query.queryKey) === queryKeyHash;
}

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

function getBattleIdFromMatches(
  matches: ReturnType<typeof useMatches>,
): string | undefined {
  for (let index = matches.length - 1; index >= 0; index -= 1) {
    const match = matches[index];
    const battleId = match?.params.battleId;

    if (typeof battleId === "string") {
      return battleId;
    }
  }
}

export function DocumentTitleUpdater({
  queryClient,
}: DocumentTitleUpdaterProps) {
  const matches = useMatches();
  const guildId = getGuildIdFromMatches(matches);
  const battleId = getBattleIdFromMatches(matches);
  const guildQueryKey = guildId
    ? getGuildsControllerGetGuildByIdQueryKey({ guildId })
    : undefined;
  const battleQueryKey = battleId
    ? getBattlesControllerGetBattleQueryKey({ battleId })
    : undefined;
  const guildQueryKeyHash = guildQueryKey ? JSON.stringify(guildQueryKey) : "";
  const battleQueryKeyHash = battleQueryKey
    ? JSON.stringify(battleQueryKey)
    : "";
  const [, setCacheVersion] = useState(0);
  const cachedGuildName = guildQueryKey
    ? queryClient.getQueryData<CachedGuild>(guildQueryKey)?.name
    : undefined;
  const cachedBattle = battleQueryKey
    ? queryClient.getQueryData<Battle>(battleQueryKey)
    : undefined;
  const title = resolveDocumentTitle(matches, {
    currentBattle: cachedBattle,
    guildName: cachedGuildName,
  });

  useEffect(() => {
    if (!guildQueryKeyHash) {
      return undefined;
    }

    return queryClient.getQueryCache().subscribe((event) => {
      if (
        !shouldRefreshDocumentTitleFromQueryCacheEvent(event, guildQueryKeyHash)
      ) {
        return;
      }

      setCacheVersion((version) => version + 1);
    });
  }, [guildQueryKeyHash, queryClient]);

  useEffect(() => {
    if (!battleQueryKeyHash) {
      return undefined;
    }

    return queryClient.getQueryCache().subscribe((event) => {
      if (
        !shouldRefreshDocumentTitleFromQueryCacheEvent(
          event,
          battleQueryKeyHash,
        )
      ) {
        return;
      }

      setCacheVersion((version) => version + 1);
    });
  }, [battleQueryKeyHash, queryClient]);

  useEffect(() => {
    document.title = title;
  }, [title]);

  return null;
}
