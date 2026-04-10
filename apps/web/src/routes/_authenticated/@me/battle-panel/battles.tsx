import { createFileRoute } from "@tanstack/react-router";
import { BattlePanelBattlesList } from "@/features/battle-panel/battle-panel-battles-list/battle-panel-battles-list";
import { BattlePanelBattlesSkeleton } from "@/features/battle-panel/battle-panel-battles-list/battle-panel-battles-skeleton";
import { battlesQueryOptions } from "@/hooks/api/battle-log/use-battles";
import { battleCharactersQueryOptions } from "@/hooks/api/battle-log/use-battle-characters";

const getSearchParamValues = (searchParams: URLSearchParams, key: string) => {
  const values = searchParams.getAll(key).filter(Boolean);
  return values.length > 0 ? values : undefined;
};

const getOptionalNumber = (searchParams: URLSearchParams, key: string) => {
  const value = searchParams.get(key);
  if (!value) return undefined;

  const parsedValue = Number.parseInt(value, 10);
  return Number.isNaN(parsedValue) ? undefined : parsedValue;
};

export const Route = createFileRoute(
  "/_authenticated/@me/battle-panel/battles",
)({
  loader: async ({ context, location }) => {
    const searchParams = new URLSearchParams(location.searchStr);

    await Promise.all([
      context.queryClient.ensureQueryData(
        battleCharactersQueryOptions({
          suppressRouteErrorToast: true,
        }),
      ),
      context.queryClient.ensureQueryData(
        battlesQueryOptions({
          cursor: searchParams.get("cursor") || undefined,
          size: 20,
          includeTotal: true,
          world: searchParams.get("world") || undefined,
          type: getSearchParamValues(searchParams, "type") as
            | Array<"solo" | "group">
            | undefined,
          search: searchParams.get("search") || undefined,
          result: getSearchParamValues(searchParams, "result") as
            | Array<"won" | "lost" | "flee">
            | undefined,
          ph: searchParams.get("ph") === "true" ? true : undefined,
          matchmaking:
            searchParams.get("matchmaking") === "true" ? true : undefined,
          characterId: getSearchParamValues(searchParams, "characterId"),
          minLevel: getOptionalNumber(searchParams, "minLevel") ?? 1,
          maxLevel: getOptionalNumber(searchParams, "maxLevel") ?? 500,
          suppressRouteErrorToast: true,
        }),
      ),
    ]);

    return null;
  },
  component: BattlePanelBattlesList,
  pendingComponent: BattlePanelBattlesSkeleton,
});
